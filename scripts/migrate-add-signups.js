/**
 * Migration: add signups table
 * Safe to run multiple times (uses IF NOT EXISTS)
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/freehold.db');

if (!fs.existsSync(dbPath)) {
  console.error('No database file found at', dbPath);
  console.error('Run npm run db:init first.');
  process.exit(1);
}

const SQL = await initSqlJs();
const dbBuffer = fs.readFileSync(dbPath);
const db = new SQL.Database(dbBuffer);

db.exec(`
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
`);

const data = db.export();
fs.writeFileSync(dbPath, Buffer.from(data));
db.close();

console.log('✓ Migration complete: signups table added to', dbPath);
