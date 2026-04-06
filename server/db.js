import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/freehold.db');

let SQL = null;
let sqlDb = null;
let initialized = false;

// SQL for creating tables (used as fallback if db file missing at runtime)
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    contact_count INTEGER DEFAULT 0,
    welcome_template_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (welcome_template_id) REFERENCES templates(id) ON DELETE SET NULL,
    UNIQUE(user_id, name)
  );

  CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    list_id INTEGER,
    tags TEXT DEFAULT '[]',
    unsubscribed INTEGER DEFAULT 0,
    unsubscribed_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE SET NULL,
    UNIQUE(user_id, email)
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
  CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_list_id ON contacts(list_id);

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    preview_vars TEXT DEFAULT '{}',
    is_preset BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    template_id INTEGER NOT NULL,
    list_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    recipients_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (list_id) REFERENCES lists(id)
  );

  CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
  CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
  CREATE INDEX IF NOT EXISTS idx_campaigns_list_id ON campaigns(list_id);

  CREATE TABLE IF NOT EXISTS campaign_sends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    message_id TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    UNIQUE(campaign_id, contact_id)
  );

  CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    message_id TEXT,
    campaign_id INTEGER,
    contact_id INTEGER,
    email TEXT,
    recipient TEXT,
    opens_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    bounces_count INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
  CREATE INDEX IF NOT EXISTS idx_events_message_id ON events(message_id);
  CREATE INDEX IF NOT EXISTS idx_events_campaign_id ON events(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_events_contact_id ON events(contact_id);
  CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    email TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    order_id TEXT,
    customer_id TEXT,
    tier TEXT NOT NULL DEFAULT 'self-hosted' CHECK(tier IN ('self-hosted', 'cloud')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'refunded', 'suspended')),
    subscription_id TEXT,
    activated_at TEXT,
    expires_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
  CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
  CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
  CREATE INDEX IF NOT EXISTS idx_licenses_order_id ON licenses(order_id);

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK(category IN ('bug', 'feature', 'general')),
    message TEXT NOT NULL,
    email TEXT,
    page TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
  CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

  CREATE TABLE IF NOT EXISTS signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT 'website',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'provisioned', 'declined')),
    notes TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email);
  CREATE INDEX IF NOT EXISTS idx_signups_status ON signups(status);
  CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at);
`;

// Prepared statement wrapper
class PreparedStatement {
  constructor(sql, database) {
    this.sql = sql;
    this.database = database;
  }

  run(...params) {
    try {
      // Clean parameters: convert undefined to null for sql.js compatibility
      const cleanParams = params.map(p => p === undefined ? null : p);
      this.database.run(this.sql, cleanParams);

      // Get last insert rowid
      let lastID = 0;
      try {
        const lastIdResult = this.database.exec('SELECT last_insert_rowid() as id');
        if (lastIdResult[0] && lastIdResult[0].values.length > 0) {
          lastID = lastIdResult[0].values[0][0];
        }
      } catch (e) {
        try {
          const lastIdResult = this.database.exec('SELECT last_insert_rowid()');
          if (lastIdResult[0] && lastIdResult[0].values.length > 0) {
            lastID = lastIdResult[0].values[0][0];
          }
        } catch (e2) {
          console.warn('Could not get last insert rowid');
        }
      }

      const changes = this.database.getRowsModified();
      return { changes, lastID, lastInsertRowid: lastID };
    } catch (err) {
      console.error('PreparedStatement.run error:', err);
      if (err.message && typeof err.message === 'string') {
        throw new Error(err.message);
      }
      throw err;
    }
  }

  get(...params) {
    try {
      const cleanParams = params.map(p => p === undefined ? null : p);
      const result = this.database.exec(this.sql, cleanParams);
      if (result[0] && result[0].values.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values[0];
        const row = {};
        columns.forEach((col, idx) => {
          row[col] = values[idx];
        });
        return row;
      }
      return undefined;
    } catch (err) {
      console.error('PreparedStatement.get error:', err);
      throw err;
    }
  }

  all(...params) {
    try {
      const cleanParams = params.map(p => p === undefined ? null : p);
      const result = this.database.exec(this.sql, cleanParams);
      if (result[0]) {
        const columns = result[0].columns;
        return result[0].values.map(values => {
          const row = {};
          columns.forEach((col, idx) => {
            row[col] = values[idx];
          });
          return row;
        });
      }
      return [];
    } catch (err) {
      console.error('PreparedStatement.all error:', err);
      throw err;
    }
  }
}

// Database wrapper
class Database {
  pragma(stmt) {
    if (!sqlDb) throw new Error('Database not initialized');
    try {
      return sqlDb.run(stmt);
    } catch (err) {
      console.warn('pragma error (ignored):', err.message);
    }
  }

  exec(sql) {
    if (!sqlDb) throw new Error('Database not initialized');
    return sqlDb.exec(sql);
  }

  prepare(sql) {
    if (!sqlDb) throw new Error('Database not initialized');
    return new PreparedStatement(sql, sqlDb);
  }

  transaction(fn) {
    return (data) => {
      try {
        return fn(data);
      } catch (err) {
        throw err;
      }
    };
  }

  close() {
    if (sqlDb) {
      const data = sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    }
  }
}

// Database initialization
async function initDb() {
  console.log('[db] Initializing sql.js...');
  console.log('[db] Database path:', dbPath);

  try {
    SQL = await initSqlJs();
    console.log('[db] sql.js engine loaded');
  } catch (err) {
    console.error('[db] FATAL: Failed to load sql.js engine:', err.message);
    throw err;
  }

  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[db] Created data directory:', dataDir);
  }

  if (fs.existsSync(dbPath)) {
    console.log('[db] Loading existing database file...');
    try {
      const dbBuffer = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(dbBuffer);
      console.log('[db] Database loaded from file (' + dbBuffer.length + ' bytes)');
    } catch (err) {
      console.error('[db] Failed to load database file, creating new:', err.message);
      sqlDb = new SQL.Database();
      sqlDb.exec(CREATE_TABLES_SQL);
      console.log('[db] Created new database with tables');
    }
  } else {
    console.log('[db] No database file found, creating new database...');
    sqlDb = new SQL.Database();
    sqlDb.exec(CREATE_TABLES_SQL);
    console.log('[db] Created new database with tables');
  }

  // Ensure tables exist (idempotent with IF NOT EXISTS)
  try {
    sqlDb.exec(CREATE_TABLES_SQL);
    console.log('[db] Tables verified');
  } catch (err) {
    console.warn('[db] Table creation warning (non-fatal):', err.message);
  }

  sqlDb.run('PRAGMA foreign_keys = ON');

  // Save to disk
  try {
    const data = sqlDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    console.log('[db] Database saved to disk');
  } catch (err) {
    console.warn('[db] Could not save to disk (non-fatal on read-only fs):', err.message);
  }

  initialized = true;
  console.log('[db] ✓ Database initialized successfully');
}

// Initialize and expose promise
const initPromise = initDb().catch(err => {
  console.error('[db] FATAL: Database initialization failed:', err);
  process.exit(1);
});

export const db = new Database();

export async function ensureDbInitialized() {
  await initPromise;
  if (!initialized || !sqlDb) {
    throw new Error('Database failed to initialize');
  }
}

export function getDb() {
  return db;
}

export default db;
