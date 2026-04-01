import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

/**
 * GET /api/analytics/overview
 * Get high-level analytics: total contacts, lists, campaigns sent
 */
router.get('/overview', (req, res, next) => {
  try {
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM contacts) as total_contacts,
        (SELECT COUNT(*) FROM lists) as total_lists,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'sent') as campaigns_sent,
        (SELECT COUNT(*) FROM campaign_sends WHERE status = 'sent') as total_emails_sent
    `).get();

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/campaign-performance
 * Get performance metrics for all campaigns or a specific one
 * Query params: campaign_id (optional), days (default: 30)
 */
router.get('/campaign-performance', (req, res, next) => {
  try {
    const campaignId = req.query.campaign_id;
    const days = parseInt(req.query.days) || 30;

    let query = `
      SELECT
        c.id,
        c.name,
        c.status,
        c.recipients_count,
        c.sent_count,
        COUNT(CASE WHEN e.event_type = 'open' THEN 1 END) as opens,
        COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN e.event_type = 'bounce' THEN 1 END) as bounces,
        CASE
          WHEN c.recipients_count > 0
          THEN ROUND(100.0 * COUNT(CASE WHEN e.event_type = 'open' THEN 1 END) / c.recipients_count, 2)
          ELSE 0
        END as open_rate,
        CASE
          WHEN c.recipients_count > 0
          THEN ROUND(100.0 * COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) / c.recipients_count, 2)
          ELSE 0
        END as click_rate,
        c.created_at,
        c.sent_at
      FROM campaigns c
      LEFT JOIN events e ON c.id = e.campaign_id AND e.created_at > datetime('now', '-' || ? || ' days')
      WHERE 1=1
    `;
    const params = [days];

    if (campaignId) {
      query += ' AND c.id = ?';
      params.push(parseInt(campaignId));
    }

    query += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100';

    const results = db.prepare(query).all(...params);

    res.json({
      data: results,
      period_days: days,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/events
 * Get all events with filtering
 * Query params: event_type, campaign_id, contact_id, limit, offset
 */
router.get('/events', (req, res, next) => {
  try {
    const eventType = req.query.event_type;
    const campaignId = req.query.campaign_id;
    const contactId = req.query.contact_id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;

    let countQuery = 'SELECT COUNT(*) as total FROM events WHERE 1=1';
    let query = `
      SELECT
        id, event_type, message_id, campaign_id, contact_id, email, recipient,
        opens_count, clicks_count, bounces_count, created_at, received_at
      FROM events
      WHERE 1=1
    `;
    const params = [];

    if (eventType) {
      countQuery += ' AND event_type = ?';
      query += ' AND event_type = ?';
      params.push(eventType);
    }

    if (campaignId) {
      countQuery += ' AND campaign_id = ?';
      query += ' AND campaign_id = ?';
      params.push(parseInt(campaignId));
    }

    if (contactId) {
      countQuery += ' AND contact_id = ?';
      query += ' AND contact_id = ?';
      params.push(parseInt(contactId));
    }

    const countResult = db.prepare(countQuery).get(...params);
    const events = db.prepare(`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);

    res.json({
      data: events,
      pagination: {
        limit,
        offset,
        total: countResult.total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/summary
 * Get a summary of recent activity
 */
router.get('/summary', (req, res, next) => {
  try {
    const summary = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM contacts) as total_contacts,
        (SELECT COUNT(*) FROM lists) as total_lists,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'sent') as campaigns_sent,
        (SELECT COUNT(*) FROM campaign_sends WHERE status = 'sent' AND sent_at > datetime('now', '-7 days')) as emails_sent_7d,
        (SELECT COUNT(*) FROM events WHERE event_type = 'open' AND created_at > datetime('now', '-7 days')) as opens_7d,
        (SELECT COUNT(*) FROM events WHERE event_type = 'click' AND created_at > datetime('now', '-7 days')) as clicks_7d,
        (SELECT COUNT(*) FROM events WHERE event_type = 'bounce' AND created_at > datetime('now', '-7 days')) as bounces_7d,
        (SELECT COUNT(*) FROM events WHERE event_type IN ('spam', 'unsubscribe') AND created_at > datetime('now', '-7 days')) as complaints_7d
    `).get();

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
