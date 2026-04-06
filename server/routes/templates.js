import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/templates
 * List all templates, optionally filtered by category
 */
router.get('/', (req, res, next) => {
  try {
    const category = req.query.category;

    let query = 'SELECT id, name, category, subject, created_at FROM templates WHERE user_id = ? OR user_id IS NULL';
    const params = [req.user.userId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY is_preset DESC, created_at DESC';

    const templates = db.prepare(query).all(...params);

    res.json(templates);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/:id
 * Get full template with HTML content
 */
router.get('/:id', (req, res, next) => {
  try {
    const template = db.prepare(`
      SELECT id, name, category, subject, html_content, preview_vars FROM templates WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(req.params.id, req.user.userId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Parse preview vars
    template.preview_vars = template.preview_vars ? JSON.parse(template.preview_vars) : {};

    res.json(template);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/templates/preview
 * Preview template with variable substitution
 * Body: { template_id, variables: { key: value } }
 */
router.post('/preview', (req, res, next) => {
  try {
    const { template_id, variables } = req.body;

    if (!template_id) {
      return res.status(400).json({ error: 'template_id is required' });
    }

    const template = db.prepare(`
      SELECT subject, html_content FROM templates WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(template_id, req.user.userId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Simple variable substitution: {{variableName}} -> value
    let subject = template.subject;
    let htmlContent = template.html_content;

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        const regex = new RegExp(placeholder, 'g');
        subject = subject.replace(regex, value || '');
        htmlContent = htmlContent.replace(regex, value || '');
      });
    }

    res.json({
      subject,
      html_content: htmlContent,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/categories
 * Get unique template categories
 */
router.get('/categories', (req, res, next) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category FROM templates ORDER BY category
    `).all();

    res.json(categories.map(c => c.category));
  } catch (error) {
    next(error);
  }
});

export default router;
