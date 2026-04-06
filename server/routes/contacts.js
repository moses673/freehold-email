import { Router } from 'express';
import { db } from '../db.js';
import { sendWelcomeEmail } from '../services/email.js';
import { contactsToCsv, validateContactsFromCsv } from '../services/csv.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

const PAGE_SIZE = 50;

/**
 * GET /api/contacts
 * List contacts with pagination and search
 */
router.get('/', (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const search = (req.query.search || '').trim();
    const listId = req.query.list_id;
    const tag = req.query.tag;

    let query = 'SELECT * FROM contacts WHERE user_id = ?';
    const params = [req.user.userId];

    if (search) {
      query += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (listId) {
      query += ' AND list_id = ?';
      params.push(parseInt(listId));
    }

    if (tag) {
      query += ` AND json_extract(tags, '$[*]') LIKE ?`;
      params.push(`%${tag}%`);
    }

    const countQuery = `SELECT COUNT(*) as total FROM contacts WHERE user_id = ?`;
    const total = db.prepare(countQuery).get(req.user.userId).total;

    const offset = (page - 1) * PAGE_SIZE;
    query += ` ORDER BY created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`;

    const contacts = db.prepare(query).all(...params);

    // Parse tags
    const formattedContacts = contacts.map(c => ({
      ...c,
      tags: c.tags ? JSON.parse(c.tags) : [],
    }));

    res.json({
      data: formattedContacts,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contacts/:id
 * Get single contact
 */
router.get('/:id', (req, res, next) => {
  try {
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    contact.tags = contact.tags ? JSON.parse(contact.tags) : [];
    res.json(contact);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contacts
 * Create new contact
 * Note: If list_id is provided and the list has a welcome_template_id,
 * a welcome email will be sent asynchronously
 */
router.post('/', (req, res, next) => {
  try {
    const { email, first_name, last_name, list_id, tags } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO contacts (user_id, email, first_name, last_name, list_id, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      const info = stmt.run(
        req.user.userId,
        email.toLowerCase().trim(),
        first_name || null,
        last_name || null,
        list_id || null,
        JSON.stringify(tags || [])
      );

      const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.userId);
      contact.tags = contact.tags ? JSON.parse(contact.tags) : [];

      // Send welcome email asynchronously if list has a welcome template
      if (list_id) {
        sendWelcomeEmail(contact.email, contact.id, list_id)
          .catch(err => console.error('Welcome email send error:', err));
      }

      res.status(201).json(contact);
    } catch (error) {
      if (error && error.message && error.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/contacts/:id
 * Update contact
 */
router.put('/:id', (req, res, next) => {
  try {
    const { email, first_name, last_name, list_id, tags } = req.body;
    const id = req.params.id;

    const stmt = db.prepare(`
      UPDATE contacts
      SET email = ?, first_name = ?, last_name = ?, list_id = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    try {
      stmt.run(
        email ? email.toLowerCase().trim() : undefined,
        first_name !== undefined ? first_name : undefined,
        last_name !== undefined ? last_name : undefined,
        list_id !== undefined ? list_id : undefined,
        tags !== undefined ? JSON.stringify(tags) : undefined,
        id,
        req.user.userId
      );

      const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(id, req.user.userId);

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      contact.tags = contact.tags ? JSON.parse(contact.tags) : [];
      res.json(contact);
    } catch (error) {
      if (error && error.message && error.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/contacts/:id
 * Delete contact
 */
router.delete('/:id', (req, res, next) => {
  try {
    const stmt = db.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?');
    const info = stmt.run(req.params.id, req.user.userId);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ success: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/contacts/import
 * Bulk import contacts from CSV
 * Body: { contacts: array of { email, first_name, last_name, tags } }
 */
router.post('/import', (req, res, next) => {
  try {
    const { contacts, list_id } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts provided' });
    }

    // Validate contacts
    const validation = validateContactsFromCsv(contacts);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Bulk insert
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO contacts (user_id, email, first_name, last_name, list_id, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((contactList) => {
      let inserted = 0;
      let updated = 0;

      for (const contact of contactList) {
        const existing = db.prepare('SELECT id FROM contacts WHERE user_id = ? AND email = ?').get(req.user.userId, contact.email);

        try {
          insertStmt.run(
            req.user.userId,
            contact.email,
            contact.first_name,
            contact.last_name,
            list_id ? parseInt(list_id) : null,
            JSON.stringify(contact.tags)
          );

          if (existing) {
            updated++;
          } else {
            inserted++;
          }
        } catch (error) {
          if (!error.message.includes('UNIQUE')) {
            throw error;
          }
        }
      }

      return { inserted, updated };
    });

    const result = transaction(validation.contacts);

    res.json({
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      total: validation.contacts.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/contacts/export
 * Export all contacts as CSV
 */
router.get('/export', (req, res, next) => {
  try {
    const listId = req.query.list_id;

    let query = 'SELECT email, first_name, last_name, tags FROM contacts WHERE user_id = ?';
    const params = [req.user.userId];

    if (listId) {
      query += ' AND list_id = ?';
      params.push(parseInt(listId));
    }

    query += ' ORDER BY created_at DESC';

    const contacts = db.prepare(query).all(...params);

    // Convert tags from JSON string to array
    const formattedContacts = contacts.map(c => ({
      ...c,
      tags: c.tags ? JSON.parse(c.tags).join(';') : '',
    }));

    const csv = contactsToCsv(formattedContacts);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;
