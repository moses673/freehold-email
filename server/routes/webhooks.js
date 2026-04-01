import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

/**
 * POST /api/webhooks/postmark
 * Receive email delivery, open, click, and bounce events from Postmark
 *
 * Postmark sends different payloads based on event type. This endpoint
 * normalizes all incoming events and stores them in the events table.
 */
router.post('/postmark', (req, res, next) => {
  try {
    const payload = req.body;

    // Postmark webhook signature verification (optional but recommended)
    // In production, verify the X-Postmark-Signature header

    // Handle different event types
    const eventType = payload.RecordType || payload.Type;

    if (!eventType) {
      return res.status(400).json({ error: 'Invalid webhook payload: missing RecordType or Type' });
    }

    // Extract relevant data based on event type
    let eventData = {
      event_type: eventType,
      message_id: payload.MessageID || null,
      email: payload.Email || payload.From || null,
      recipient: payload.Recipient || payload.Email || null,
      metadata: JSON.stringify(payload),
      received_at: new Date().toISOString(),
    };

    // Try to find associated campaign and contact using message metadata
    if (payload.Metadata) {
      const metadata = payload.Metadata;
      if (metadata.campaignId) {
        eventData.campaign_id = parseInt(metadata.campaignId);
      }
      if (metadata.contactId) {
        eventData.contact_id = parseInt(metadata.contactId);
      }
    }

    // If we don't have campaign/contact IDs from metadata, try to find via message_id
    if (!eventData.campaign_id && eventData.message_id) {
      const send = db.prepare(`
        SELECT campaign_id, contact_id FROM campaign_sends
        WHERE message_id = ?
      `).get(eventData.message_id);

      if (send) {
        eventData.campaign_id = send.campaign_id;
        eventData.contact_id = send.contact_id;
      }
    }

    // Handle event type specific fields
    switch (eventType) {
      case 'Delivery':
        eventData.event_type = 'delivery';
        break;
      case 'Open':
        eventData.event_type = 'open';
        // Update aggregate open count
        updateAggregateEvent(eventData, 'opens_count');
        break;
      case 'Click':
        eventData.event_type = 'click';
        // Update aggregate click count
        updateAggregateEvent(eventData, 'clicks_count');
        break;
      case 'Bounce':
        eventData.event_type = 'bounce';
        eventData.bounce_type = payload.Details?.BounceType || 'unknown';
        eventData.bounce_description = payload.Details?.BounceDescription || null;
        // Update aggregate bounce count
        updateAggregateEvent(eventData, 'bounces_count');
        // Mark send as failed
        if (eventData.message_id) {
          db.prepare(`
            UPDATE campaign_sends
            SET status = 'bounced', error_message = ?
            WHERE message_id = ?
          `).run(eventData.bounce_description || 'Bounced', eventData.message_id);
        }
        break;
      case 'SpamComplaint':
        eventData.event_type = 'spam';
        break;
      case 'Unsubscribe':
        eventData.event_type = 'unsubscribe';
        break;
      default:
        eventData.event_type = eventType.toLowerCase();
    }

    // Store the event
    const stmt = db.prepare(`
      INSERT INTO events (
        event_type, message_id, campaign_id, contact_id, email, recipient, metadata, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      eventData.event_type,
      eventData.message_id,
      eventData.campaign_id || null,
      eventData.contact_id || null,
      eventData.email,
      eventData.recipient,
      eventData.metadata,
      eventData.received_at
    );

    console.log(`✓ Webhook event recorded: ${eventType} (ID: ${info.lastInsertRowid})`);

    res.status(202).json({
      success: true,
      eventId: info.lastInsertRowid,
      eventType: eventData.event_type,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    next(error);
  }
});

/**
 * Helper function to update aggregate event counts
 * (used for opens, clicks, bounces within a single event record)
 */
function updateAggregateEvent(eventData, countField) {
  if (eventData.message_id) {
    // Check if we already have an aggregate event for this message
    const existing = db.prepare(`
      SELECT id FROM events
      WHERE message_id = ? AND event_type IN ('open', 'click', 'bounce')
      LIMIT 1
    `).get(eventData.message_id);

    if (existing) {
      // Update existing aggregate
      db.prepare(`
        UPDATE events SET ${countField} = ${countField} + 1
        WHERE id = ?
      `).run(existing.id);
    }
  }
}

/**
 * GET /api/webhooks/postmark/status
 * Check webhook configuration status (for debugging)
 */
router.get('/postmark/status', (req, res, next) => {
  try {
    const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get();
    const recentEvents = db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM events
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY event_type
      ORDER BY count DESC
    `).all();

    res.json({
      status: 'configured',
      totalEvents: eventCount.count,
      last24Hours: recentEvents,
      endpoint: '/api/webhooks/postmark',
      instructions: 'Configure this endpoint in your Postmark account settings under "Webhooks"',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
