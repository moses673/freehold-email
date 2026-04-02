import { Router } from 'express';
import axios from 'axios';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const VALID_CATEGORIES = ['bug', 'feature', 'general'];

/**
 * POST /api/feedback
 * Public endpoint to submit feedback
 * Body: { category, message, email?, page? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { category, message, email, page } = req.body;

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category. Must be one of: bug, feature, general',
      });
    }

    // Validate message
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: 'Message must be under 2000 characters',
      });
    }

    // Prepare data
    const userAgent = req.get('user-agent') || null;
    const feedbackEmail = email ? email.toLowerCase().trim() : null;
    const feedbackPage = page || null;

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO feedback (category, message, email, page, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(category, message.trim(), feedbackEmail, feedbackPage, userAgent);
    const feedbackId = info.lastInsertRowid;

    // Send notification email to moses@freeholdtools.com via Postmark
    const postmarkApiKey = process.env.POSTMARK_API_KEY;
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'noreply@freeholdtools.com';

    if (postmarkApiKey && fromEmail) {
      try {
        const subject = `[Freehold Feedback] ${category}: ${message.substring(0, 60)}${message.length > 60 ? '...' : ''}`;

        const htmlBody = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2>New Feedback Submission</h2>
              <p><strong>Category:</strong> ${escapeHtml(category)}</p>
              <p><strong>Message:</strong></p>
              <p style="background-color: #f5f5f5; padding: 12px; border-left: 4px solid #4f46e5;">
                ${escapeHtml(message).replace(/\n/g, '<br />')}
              </p>
              ${feedbackEmail ? `<p><strong>Email:</strong> ${escapeHtml(feedbackEmail)}</p>` : ''}
              ${feedbackPage ? `<p><strong>Page:</strong> ${escapeHtml(feedbackPage)}</p>` : ''}
              <p><strong>User Agent:</strong> ${escapeHtml(userAgent || 'Not provided')}</p>
              <p style="color: #888; font-size: 12px; margin-top: 20px;">
                Feedback ID: ${feedbackId}<br />
                Submitted at: ${new Date().toISOString()}
              </p>
            </body>
          </html>
        `;

        await axios.post(
          'https://api.postmarkapp.com/email',
          {
            From: fromEmail,
            To: 'moses@freeholdtools.com',
            Subject: subject,
            HtmlBody: htmlBody,
          },
          {
            headers: {
              'X-Postmark-Server-Token': postmarkApiKey,
            },
          }
        );
      } catch (emailError) {
        console.warn('[feedback] Failed to send notification email:', emailError.message);
        // Don't fail the request if email sending fails
      }
    }

    res.status(201).json({
      success: true,
      id: feedbackId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/feedback
 * Protected endpoint to retrieve all feedback
 * Returns: { feedback: [...] }
 */
router.get('/', requireAuth, (req, res, next) => {
  try {
    const feedback = db.prepare(`
      SELECT * FROM feedback ORDER BY created_at DESC
    `).all();

    res.json({
      feedback,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export default router;
