import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'freehold-dev-secret-change-in-production';
const JWT_EXPIRY = '7d';
// Cost factor 4 — the free Render tier (0.1 CPU) makes cost 6 take 20+ seconds.
// Upgrade to cost 10 when on a paid instance.
const BCRYPT_ROUNDS = 4;

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcryptjs.hash(password, BCRYPT_ROUNDS);

    const stmt = db.prepare(
      `INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)`
    );

    try {
      stmt.run(email, passwordHash, name || null);
    } catch (err) {
      if (err && err.message && err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw err;
    }

    const user = db.prepare(`SELECT id, email, name FROM users WHERE email = ?`).get(email);

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare(`SELECT id, email, name, password_hash FROM users WHERE email = ?`).get(email);

    // Use async compare to avoid blocking the event loop
    const passwordMatch = user ? await bcryptjs.compare(password, user.password_hash) : false;

    if (!user || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare(`SELECT id, email, name FROM users WHERE id = ?`).get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token clearing)
 */
router.post('/logout', (req, res) => {
  return res.json({ success: true });
});

export default router;
