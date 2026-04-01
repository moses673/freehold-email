import { Router } from 'express';
import { db } from '../db.js';
import { verifyUnsubscribeToken } from '../services/email.js';

const router = Router();

/**
 * GET /unsubscribe?token=TOKEN
 * Handle unsubscribe requests
 */
router.get('/unsubscribe', (req, res) => {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(400).send(`
<!DOCTYPE html>
<html>
<head><title>Invalid Unsubscribe Link — Freehold</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#1A1B1E;">
  <h1 style="font-size:28px;">Invalid unsubscribe link.</h1>
  <p style="color:#666;">The unsubscribe link appears to be missing or expired.</p>
</body>
</html>
      `);
    }

    // Verify token
    const tokenData = verifyUnsubscribeToken(token);

    if (!tokenData) {
      return res.status(400).send(`
<!DOCTYPE html>
<html>
<head><title>Invalid Unsubscribe Link — Freehold</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#1A1B1E;">
  <h1 style="font-size:28px;">Invalid or expired unsubscribe link.</h1>
  <p style="color:#666;">We couldn't process your unsubscribe request. Please try again or contact support.</p>
</body>
</html>
      `);
    }

    const { contactId } = tokenData;

    // Get contact to verify it exists
    const contact = db.prepare('SELECT id, email FROM contacts WHERE id = ?').get(contactId);

    if (!contact) {
      return res.status(400).send(`
<!DOCTYPE html>
<html>
<head><title>Invalid Unsubscribe Link — Freehold</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#1A1B1E;">
  <h1 style="font-size:28px;">Invalid or expired unsubscribe link.</h1>
  <p style="color:#666;">We couldn't find the associated contact.</p>
</body>
</html>
      `);
    }

    // Mark contact as unsubscribed
    db.prepare(`
      UPDATE contacts
      SET unsubscribed = 1, unsubscribed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(contactId);

    console.log(`✓ Contact unsubscribed: ${contact.email} (ID: ${contactId})`);

    // Return success page
    res.send(`
<!DOCTYPE html>
<html>
<head><title>Unsubscribed — Freehold</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#1A1B1E;">
  <h1 style="font-size:28px;">You've been unsubscribed.</h1>
  <p style="color:#666;">You won't receive any more emails from this sender.</p>
</body>
</html>
    `);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send(`
<!DOCTYPE html>
<html>
<head><title>Error — Freehold</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#1A1B1E;">
  <h1 style="font-size:28px;">An error occurred.</h1>
  <p style="color:#666;">We encountered an error processing your request. Please try again later.</p>
</body>
</html>
    `);
  }
});

export default router;
