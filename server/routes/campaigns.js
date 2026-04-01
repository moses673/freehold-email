import { Router } from 'express';
import { db } from '../db.js';
import { sendCampaign, getCampaignSendStatus } from '../services/email.js';

const router = Router();

/**
 * GET /api/campaigns
 * List all campaigns
 */
router.get('/', (req, res, next) => {
  try {
    const status = req.query.status;

    let query = `
      SELECT
        c.id,
        c.name,
        c.template_id,
        c.list_id,
        c.subject,
        c.status,
        c.recipients_count,
        c.sent_count,
        c.created_at,
        c.sent_at,
        t.name as template_name,
        l.name as list_name
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      LEFT JOIN lists l ON c.list_id = l.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC';

    const campaigns = db.prepare(query).all(...params);

    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/campaigns/:id
 * Get campaign details
 */
router.get('/:id', (req, res, next) => {
  try {
    const campaign = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.template_id,
        c.list_id,
        c.subject,
        c.html_content,
        c.status,
        c.recipients_count,
        c.sent_count,
        c.created_at,
        c.sent_at,
        t.name as template_name
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/campaigns
 * Create new campaign (draft)
 */
router.post('/', (req, res, next) => {
  try {
    const { name, template_id, list_id, subject, html_content } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    if (!template_id) {
      return res.status(400).json({ error: 'template_id is required' });
    }

    if (!list_id) {
      return res.status(400).json({ error: 'list_id is required' });
    }

    // Get contact count for the list
    const listData = db.prepare(`
      SELECT COUNT(*) as count FROM contacts WHERE list_id = ?
    `).get(list_id);

    const stmt = db.prepare(`
      INSERT INTO campaigns (name, template_id, list_id, subject, html_content, recipients_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      name.trim(),
      template_id,
      list_id,
      subject || '',
      html_content || '',
      listData.count
    );

    const campaign = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.template_id,
        c.list_id,
        c.subject,
        c.html_content,
        c.status,
        c.recipients_count,
        c.sent_count,
        c.created_at,
        t.name as template_name
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/campaigns/:id
 * Update campaign (only draft campaigns)
 */
router.put('/:id', (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, subject, html_content } = req.body;

    const campaign = db.prepare('SELECT status FROM campaigns WHERE id = ?').get(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Can only update draft campaigns' });
    }

    const stmt = db.prepare(`
      UPDATE campaigns
      SET name = ?, subject = ?, html_content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      name !== undefined ? name : undefined,
      subject !== undefined ? subject : undefined,
      html_content !== undefined ? html_content : undefined,
      id
    );

    const updated = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.template_id,
        c.list_id,
        c.subject,
        c.html_content,
        c.status,
        c.recipients_count,
        c.sent_count,
        c.created_at,
        t.name as template_name
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      WHERE c.id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/campaigns/:id/send
 * Send campaign to list
 */
router.post('/:id/send', async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id);

    const campaign = db.prepare(`
      SELECT c.id, c.status, c.list_id, c.subject, c.html_content
      FROM campaigns c
      WHERE c.id = ?
    `).get(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Campaign is not in draft status' });
    }

    // Get all unsubscribed contacts in the list (skip unsubscribed ones)
    const contacts = db.prepare(`
      SELECT email FROM contacts WHERE list_id = ? AND (unsubscribed IS NULL OR unsubscribed = 0)
    `).all(campaign.list_id);

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts in the selected list' });
    }

    const recipientEmails = contacts.map(c => c.email);

    // Send campaign (async, don't wait)
    sendCampaign(campaignId, recipientEmails, campaign.subject, campaign.html_content)
      .catch(err => console.error('Campaign send error:', err));

    res.json({
      success: true,
      campaignId,
      message: 'Campaign sending started. Check status for updates.',
      recipientCount: recipientEmails.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/campaigns/:id/status
 * Get campaign send status
 */
router.get('/:id/status', (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id);

    const status = getCampaignSendStatus(campaignId);

    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/campaigns/:id/preview
 * Preview campaign email
 */
router.get('/:id/preview', (req, res, next) => {
  try {
    const campaign = db.prepare(`
      SELECT subject, html_content FROM campaigns WHERE id = ?
    `).get(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      subject: campaign.subject,
      html_content: campaign.html_content,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
