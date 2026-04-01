import axios from 'axios';
import crypto from 'crypto';
import { db } from '../db.js';

const POSTMARK_API = 'https://api.postmarkapp.com/email/batch';
const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || 'noreply@example.com';
const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'your-secret-key-change-this-in-env';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

if (!POSTMARK_API_KEY) {
  console.warn('⚠️  POSTMARK_API_KEY not set - email sending disabled');
}

// Rate limiting: max 100 emails per second
const RATE_LIMIT_DELAY_MS = 10;
const BATCH_SIZE = 100;

/**
 * Generate an unsubscribe token for a contact and campaign
 * Format: base64url(contactId:campaignId:hmac)
 */
export function generateUnsubscribeToken(contactId, campaignId) {
  const data = `${contactId}:${campaignId}`;
  const hmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET);
  hmac.update(data);
  const hash = hmac.digest('hex');
  const tokenData = `${data}:${hash}`;
  return Buffer.from(tokenData).toString('base64url');
}

/**
 * Verify and decode an unsubscribe token
 * Returns { contactId, campaignId } or null if invalid
 */
export function verifyUnsubscribeToken(token) {
  try {
    const tokenData = Buffer.from(token, 'base64url').toString('utf-8');
    const [contactId, campaignId, hash] = tokenData.split(':');

    if (!contactId || !campaignId || !hash) {
      return null;
    }

    // Verify HMAC
    const data = `${contactId}:${campaignId}`;
    const hmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET);
    hmac.update(data);
    const expectedHash = hmac.digest('hex');

    if (hash !== expectedHash) {
      return null;
    }

    return {
      contactId: parseInt(contactId),
      campaignId: parseInt(campaignId),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Append unsubscribe footer to HTML content
 */
function appendUnsubscribeFooter(htmlContent, unsubscribeToken, listName = 'our email list') {
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`;
  const footer = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#999;font-family:sans-serif;">
  You received this email because you're subscribed to ${listName}.<br>
  <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>
</div>`;

  // Append before closing body tag if it exists, otherwise just append
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', footer + '</body>');
  }
  return htmlContent + footer;
}

/**
 * Send a single email via Postmark
 * contactId and campaignId are optional but recommended for unsubscribe functionality
 */
export async function sendEmail(to, subject, htmlContent, metadata = {}, contactId = null, campaignId = null) {
  if (!POSTMARK_API_KEY) {
    throw new Error('Postmark API key not configured');
  }

  try {
    let finalHtmlContent = htmlContent;

    // Inject unsubscribe footer if contactId and campaignId are provided
    if (contactId && campaignId) {
      const token = generateUnsubscribeToken(contactId, campaignId);
      finalHtmlContent = appendUnsubscribeFooter(htmlContent, token);
    }

    const response = await axios.post(POSTMARK_API, [
      {
        From: FROM_EMAIL,
        To: to,
        Subject: subject,
        HtmlBody: finalHtmlContent,
        Metadata: metadata,
      },
    ], {
      headers: {
        'X-Postmark-Server-Token': POSTMARK_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    return {
      success: true,
      messageId: response.data[0]?.MessageID,
      status: response.data[0]?.ErrorCode === 0 ? 'sent' : 'failed',
    };
  } catch (error) {
    console.error('Postmark API error:', error.message);
    return {
      success: false,
      error: error.message,
      status: 'failed',
    };
  }
}

/**
 * Batch send campaign to list
 * Returns campaign ID and start timestamp
 */
export async function sendCampaign(campaignId, recipientEmails, subject, htmlContent) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  if (campaign.status !== 'draft') {
    throw new Error(`Cannot send campaign with status: ${campaign.status}`);
  }

  // Update campaign to 'sending'
  db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('sending', campaignId);

  // Create send records for all recipients
  const insertSend = db.prepare(`
    INSERT OR IGNORE INTO campaign_sends (campaign_id, contact_id, email, status)
    SELECT ?, id, email, 'pending'
    FROM contacts
    WHERE email IN (${recipientEmails.map(() => '?').join(',')})
  `);

  insertSend.run(campaignId, ...recipientEmails);

  // Get all pending sends
  const sends = db.prepare(`
    SELECT id, campaign_id, contact_id, email FROM campaign_sends
    WHERE campaign_id = ? AND status = 'pending'
  `).all(campaignId);

  const updateSend = db.prepare(`
    UPDATE campaign_sends SET status = ?, message_id = ?, sent_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const updateSendError = db.prepare(`
    UPDATE campaign_sends SET status = ?, error_message = ?
    WHERE id = ?
  `);

  let sentCount = 0;
  let failedCount = 0;

  // Send in batches with rate limiting
  for (let i = 0; i < sends.length; i += BATCH_SIZE) {
    const batch = sends.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (send) => {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));

      try {
        const result = await sendEmail(send.email, subject, htmlContent, {
          campaignId: campaignId.toString(),
          contactId: send.contact_id.toString(),
        }, send.contact_id, campaignId);

        if (result.success) {
          updateSend.run('sent', result.messageId, send.id);
          sentCount++;
        } else {
          updateSendError.run('failed', result.error, send.id);
          failedCount++;
        }
      } catch (error) {
        updateSendError.run('failed', error.message, send.id);
        failedCount++;
      }
    });

    await Promise.all(promises);
  }

  // Update campaign status to 'sent'
  db.prepare(`
    UPDATE campaigns
    SET status = 'sent', sent_at = CURRENT_TIMESTAMP, sent_count = ?
    WHERE id = ?
  `).run(sentCount, campaignId);

  return {
    campaignId,
    sentCount,
    failedCount,
    totalRecipients: sends.length,
  };
}

/**
 * Get send status for a campaign
 */
export function getCampaignSendStatus(campaignId) {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM campaign_sends
    WHERE campaign_id = ?
  `).get(campaignId);

  return {
    campaignId,
    ...stats,
  };
}

/**
 * Send welcome email to a new contact if list has welcome template configured
 */
export async function sendWelcomeEmail(contactEmail, contactId, listId) {
  try {
    // Get the list's welcome template
    const list = db.prepare(`
      SELECT welcome_template_id FROM lists WHERE id = ?
    `).get(listId);

    if (!list || !list.welcome_template_id) {
      // No welcome template configured, skip
      return { sent: false, reason: 'No welcome template configured' };
    }

    // Get the template
    const template = db.prepare(`
      SELECT subject, html_content FROM templates WHERE id = ?
    `).get(list.welcome_template_id);

    if (!template) {
      return { sent: false, reason: 'Welcome template not found' };
    }

    // Send the welcome email
    const result = await sendEmail(
      contactEmail,
      template.subject,
      template.html_content,
      {
        type: 'welcome',
        contactId: contactId.toString(),
        listId: listId.toString(),
      }
    );

    if (result.success) {
      console.log(`✓ Welcome email sent to ${contactEmail}`);
      return {
        sent: true,
        messageId: result.messageId,
      };
    } else {
      console.error(`✗ Failed to send welcome email to ${contactEmail}:`, result.error);
      return {
        sent: false,
        error: result.error,
      };
    }
  } catch (error) {
    console.error('Welcome email error:', error);
    return {
      sent: false,
      error: error.message,
    };
  }
}

/**
 * Validate Postmark connection
 */
export async function validatePostmarkKey() {
  if (!POSTMARK_API_KEY) {
    return {
      valid: false,
      reason: 'API key not configured',
    };
  }

  try {
    const response = await axios.get('https://api.postmarkapp.com/account', {
      headers: {
        'X-Postmark-Account-Token': POSTMARK_API_KEY,
      },
      timeout: 5000,
    });

    return {
      valid: true,
      account: response.data.Name,
    };
  } catch (error) {
    return {
      valid: false,
      reason: error.message,
    };
  }
}
