import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/lists
 * Get all contact lists with contact counts
 */
router.get('/', (req, res, next) => {
  try {
    const lists = db.prepare(`
      SELECT
        l.id,
        l.name,
        l.description,
        l.created_at,
        COUNT(c.id) as contact_count
      FROM lists l
      LEFT JOIN contacts c ON l.id = c.list_id
      WHERE l.user_id = ?
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `).all(req.user.userId);

    res.json(lists);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/lists/:id
 * Get single list with contacts
 */
router.get('/:id', (req, res, next) => {
  try {
    const list = db.prepare(`
      SELECT
        l.id,
        l.name,
        l.description,
        l.created_at,
        COUNT(c.id) as contact_count
      FROM lists l
      LEFT JOIN contacts c ON l.id = c.list_id
      WHERE l.id = ? AND l.user_id = ?
      GROUP BY l.id
    `).get(req.params.id, req.user.userId);

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    res.json(list);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/lists
 * Create new list
 */
router.post('/', (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'List name is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO lists (user_id, name, description)
      VALUES (?, ?, ?)
    `);

    try {
      const info = stmt.run(req.user.userId, name.trim(), description || null);

      const list = db.prepare(`
        SELECT
          id,
          name,
          description,
          created_at,
          0 as contact_count
        FROM lists
        WHERE id = ? AND user_id = ?
      `).get(info.lastInsertRowid, req.user.userId);

      res.status(201).json(list);
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'List name already exists' });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/lists/:id
 * Update list
 */
router.put('/:id', (req, res, next) => {
  try {
    const { name, description } = req.body;
    const id = req.params.id;

    const stmt = db.prepare(`
      UPDATE lists
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    try {
      stmt.run(
        name !== undefined ? name.trim() : undefined,
        description !== undefined ? description : undefined,
        id,
        req.user.userId
      );

      const list = db.prepare(`
        SELECT
          l.id,
          l.name,
          l.description,
          l.created_at,
          COUNT(c.id) as contact_count
        FROM lists l
        LEFT JOIN contacts c ON l.id = c.list_id
        WHERE l.id = ? AND l.user_id = ?
        GROUP BY l.id
      `).get(id, req.user.userId);

      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json(list);
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'List name already exists' });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/lists/:id
 * Delete list (contacts are unassigned, not deleted)
 */
router.delete('/:id', (req, res, next) => {
  try {
    const id = req.params.id;

    // Check if list exists
    const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(id, req.user.userId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const deleteStmt = db.prepare('DELETE FROM lists WHERE id = ? AND user_id = ?');
    deleteStmt.run(id, req.user.userId);

    // Unassign contacts from deleted list
    db.prepare('UPDATE contacts SET list_id = NULL WHERE list_id = ? AND user_id = ?').run(id, req.user.userId);

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/lists/:id/welcome-template
 * Get the welcome template for a list
 */
router.get('/:id/welcome-template', (req, res, next) => {
  try {
    const id = req.params.id;

    const list = db.prepare(`
      SELECT l.id, l.welcome_template_id, t.id as template_id, t.name, t.subject, t.html_content
      FROM lists l
      LEFT JOIN templates t ON l.welcome_template_id = t.id
      WHERE l.id = ? AND l.user_id = ?
    `).get(id, req.user.userId);

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (!list.template_id) {
      return res.json({ welcomeTemplate: null });
    }

    res.json({
      welcomeTemplate: {
        id: list.template_id,
        name: list.name,
        subject: list.subject,
        html_content: list.html_content,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/lists/:id/welcome-template
 * Set the welcome template for a list
 * Body: { welcome_template_id: number | null }
 */
router.put('/:id/welcome-template', (req, res, next) => {
  try {
    const id = req.params.id;
    const { welcome_template_id } = req.body;

    // Check if list exists
    const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(id, req.user.userId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // If welcome_template_id is provided, validate it exists (and belongs to user)
    if (welcome_template_id !== null && welcome_template_id !== undefined) {
      const template = db.prepare('SELECT id FROM templates WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(welcome_template_id, req.user.userId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
    }

    // Update the list
    db.prepare('UPDATE lists SET welcome_template_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
      .run(welcome_template_id || null, id, req.user.userId);

    // Fetch and return updated list
    const updated = db.prepare(`
      SELECT
        l.id,
        l.name,
        l.description,
        l.welcome_template_id,
        l.created_at,
        COUNT(c.id) as contact_count,
        t.name as welcome_template_name
      FROM lists l
      LEFT JOIN contacts c ON l.id = c.list_id
      LEFT JOIN templates t ON l.welcome_template_id = t.id
      WHERE l.id = ? AND l.user_id = ?
      GROUP BY l.id
    `).get(id, req.user.userId);

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
