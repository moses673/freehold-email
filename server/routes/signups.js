import { Router } from 'express';
import cors from 'cors';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const FOUNDING_USER_LIMIT = 20;

// Allow the marketing site to POST signups cross-origin
const publicCors = cors({
  origin: ['https://freeholdtools.com', 'https://www.freeholdtools.com'],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

/**
 * POST /api/signups
 * Public endpoint — accepts founding user claim from freeholdtools.com
 * Body: { name, email }
 */
router.options('/', publicCors); // preflight
router.post('/', publicCors, (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailLower = email.toLowerCase().trim();
    const nameTrimmed = name.trim();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check founding user cap
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM signups WHERE status != 'declined'`).get();
    if (countRow.count >= FOUNDING_USER_LIMIT) {
      return res.status(409).json({
        error: 'founding_limit_reached',
        message: 'The founding user offer has closed. All 20 slots are taken.',
      });
    }

    // Check for duplicate email
    const existing = db.prepare(`SELECT id, status FROM signups WHERE email = ?`).get(emailLower);
    if (existing) {
      return res.status(409).json({
        error: 'already_registered',
        message: 'This email has already claimed a founding copy.',
      });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.get('user-agent') || null;

    db.prepare(`
      INSERT INTO signups (name, email, source, ip_address, user_agent)
      VALUES (?, ?, 'website', ?, ?)
    `).run(nameTrimmed, emailLower, ipAddress, userAgent);

    const remaining = FOUNDING_USER_LIMIT - (countRow.count + 1);

    console.log(`[signups] New founding user: ${emailLower} (${remaining} slots remaining)`);

    res.status(201).json({
      success: true,
      message: "You're on the list. Moses will send you access within 24 hours.",
      remaining,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/signups
 * Protected — admin list of all signups
 */
router.get('/', requireAuth, (req, res, next) => {
  try {
    const signups = db.prepare(`
      SELECT id, name, email, source, status, notes, created_at
      FROM signups
      ORDER BY created_at ASC
    `).all();

    const stats = {
      total: signups.length,
      pending: signups.filter(s => s.status === 'pending').length,
      provisioned: signups.filter(s => s.status === 'provisioned').length,
      declined: signups.filter(s => s.status === 'declined').length,
      remaining: Math.max(0, FOUNDING_USER_LIMIT - signups.filter(s => s.status !== 'declined').length),
      limit: FOUNDING_USER_LIMIT,
    };

    res.json({ signups, stats });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/signups/:id
 * Protected — update signup status or notes
 * Body: { status?, notes? }
 */
router.patch('/:id', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'provisioned', 'declined'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = db.prepare(`SELECT id FROM signups WHERE id = ?`).get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    if (status !== undefined) {
      db.prepare(`UPDATE signups SET status = ? WHERE id = ?`).run(status, id);
    }
    if (notes !== undefined) {
      db.prepare(`UPDATE signups SET notes = ? WHERE id = ?`).run(notes, id);
    }

    const updated = db.prepare(`SELECT id, name, email, source, status, notes, created_at FROM signups WHERE id = ?`).get(id);
    res.json({ signup: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
