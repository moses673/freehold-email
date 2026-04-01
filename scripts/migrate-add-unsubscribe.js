import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/freehold.db');

// Open database
const db = new Database(dbPath);

try {
  // Check if unsubscribed column exists
  const contactsInfo = db.pragma('table_info(contacts)');
  const hasUnsubscribed = contactsInfo.some(col => col.name === 'unsubscribed');
  const hasUnsubscribedAt = contactsInfo.some(col => col.name === 'unsubscribed_at');

  if (!hasUnsubscribed) {
    console.log('Adding unsubscribed column to contacts table...');
    db.exec('ALTER TABLE contacts ADD COLUMN unsubscribed INTEGER DEFAULT 0');
    console.log('✓ Added unsubscribed column');
  } else {
    console.log('✓ unsubscribed column already exists');
  }

  if (!hasUnsubscribedAt) {
    console.log('Adding unsubscribed_at column to contacts table...');
    db.exec('ALTER TABLE contacts ADD COLUMN unsubscribed_at TEXT');
    console.log('✓ Added unsubscribed_at column');
  } else {
    console.log('✓ unsubscribed_at column already exists');
  }

  console.log('✓ Migration completed successfully');
} catch (error) {
  console.error('Migration error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
