import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/freehold.db');

// Load existing database (created by init-db.js)
const SQL = await initSqlJs();
let db;
if (fs.existsSync(dbPath)) {
  const dbBuffer = fs.readFileSync(dbPath);
  db = new SQL.Database(dbBuffer);
  console.log('Loaded existing database for seeding...');
} else {
  db = new SQL.Database();
  console.log('Creating new database for seeding...');
}

db.run('PRAGMA foreign_keys = ON');

// Helper: exec a single statement with params and return last insert rowid
function run(sql, params = []) {
  db.run(sql, params);
  const result = db.exec('SELECT last_insert_rowid() as id');
  if (result[0] && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return null;
}

// Helper: get a single row
function get(sql, params = []) {
  const result = db.exec(sql, params);
  if (result[0] && result[0].values.length > 0) {
    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = {};
    columns.forEach((col, idx) => { row[col] = values[idx]; });
    return row;
  }
  return null;
}

// Seed default lists
db.run(`INSERT OR IGNORE INTO lists (name, description) VALUES ('Subscribers', 'General mailing list')`);
db.run(`INSERT OR IGNORE INTO lists (name, description) VALUES ('VIP Customers', 'High-value customers')`);
db.run(`INSERT OR IGNORE INTO lists (name, description) VALUES ('Trial Users', 'Free trial signups')`);

const subscribersList = get(`SELECT id FROM lists WHERE name = 'Subscribers'`);
const vipList = get(`SELECT id FROM lists WHERE name = 'VIP Customers'`);
const subscribersListId = subscribersList ? subscribersList.id : 1;
const vipListId = vipList ? vipList.id : 2;

// Seed sample contacts
db.run(`INSERT OR IGNORE INTO contacts (email, first_name, last_name, list_id, tags) VALUES ('alice@example.com', 'Alice', 'Johnson', ?, '["active"]')`, [subscribersListId]);
db.run(`INSERT OR IGNORE INTO contacts (email, first_name, last_name, list_id, tags) VALUES ('bob@example.com', 'Bob', 'Smith', ?, '["active"]')`, [subscribersListId]);
db.run(`INSERT OR IGNORE INTO contacts (email, first_name, last_name, list_id, tags) VALUES ('carol@example.com', 'Carol', 'White', ?, '["vip","premium"]')`, [vipListId]);
db.run(`INSERT OR IGNORE INTO contacts (email, first_name, last_name, list_id, tags) VALUES ('dave@example.com', 'Dave', 'Brown', ?, '["vip","engaged"]')`, [vipListId]);
db.run(`INSERT OR IGNORE INTO contacts (email, first_name, last_name, list_id, tags) VALUES ('eve@example.com', 'Eve', 'Davis', ?, '["inactive"]')`, [subscribersListId]);

// Seed email templates
const templates = [
  ['Summer Sale 2024', 'promotional', 'Limited Time: {{discountPercent}}% Off Everything!', `<html><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;"><table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"><tr><td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; font-size: 32px;">{{discountPercent}}% OFF</h1><p style="margin: 10px 0 0 0; font-size: 18px;">Everything in Store</p></td></tr><tr><td style="padding: 40px 30px;"><h2 style="color: #333; margin-top: 0;">Dear {{firstName}},</h2><p style="color: #666; line-height: 1.6;">This is a limited-time offer just for you. Browse our full collection and save {{discountPercent}}% on your entire purchase.</p><div style="text-align: center; margin: 30px 0;"><a href="{{shopLink}}" style="display: inline-block; padding: 12px 40px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Shop Now</a></div><p style="color: #999; font-size: 12px; text-align: center;">Offer valid until {{expiryDate}}</p></td></tr></table></body></html>`],
  ['Monthly Newsletter', 'newsletter', 'Your {{monthYear}} Update', `<html><body style="font-family: Georgia, serif; margin: 0; padding: 20px; background-color: #f9f9f9;"><table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white;"><tr><td style="padding: 30px; border-bottom: 4px solid #2c3e50;"><h1 style="color: #2c3e50; margin: 0; font-size: 28px;">{{monthYear}} Newsletter</h1></td></tr><tr><td style="padding: 30px;"><h2 style="color: #34495e; font-size: 20px;">Featured Article</h2><p style="color: #555; line-height: 1.8; margin: 0 0 20px 0;">{{articlePreview}}</p><a href="{{articleLink}}" style="color: #2980b9; text-decoration: none;">Read Full Article →</a></td></tr></table></body></html>`],
  ['Product Launch', 'announcement', '🎉 Introducing {{productName}}', `<html><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;"><table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto;"><tr><td style="padding: 40px 30px; text-align: center; background-color: #f0f4ff; border-radius: 8px;"><h1 style="color: #1a3a52; margin: 0;">{{productName}} is Here!</h1></td></tr><tr><td style="padding: 30px;"><p style="color: #666; line-height: 1.7;">Hi {{firstName}},</p><p style="color: #666; line-height: 1.7;">{{announcementDetails}}</p><div style="text-align: center; margin: 30px 0;"><a href="{{learnMoreLink}}" style="display: inline-block; padding: 14px 48px; background-color: #007acc; color: white; text-decoration: none; border-radius: 6px;">Learn More</a></div></td></tr></table></body></html>`],
  ['Thank You for Purchase', 'thank you', 'Order Confirmation - {{orderNumber}}', `<html><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;"><table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px;"><tr><td style="padding: 30px; text-align: center; border-bottom: 2px solid #10b981;"><h2 style="color: #1f2937; margin: 0;">✓ Thank You!</h2><p style="color: #6b7280; margin: 5px 0 0 0;">Order #{{orderNumber}}</p></td></tr><tr><td style="padding: 30px;"><p style="color: #374151; line-height: 1.6;">Hi {{firstName}}, thank you for your purchase!</p><div style="text-align: center; margin: 30px 0;"><a href="{{trackingLink}}" style="display: inline-block; padding: 12px 36px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px;">Track Order</a></div></td></tr></table></body></html>`],
  ['Welcome to Our Community', 'welcome', 'Welcome aboard, {{firstName}}!', `<html><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"><table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden;"><tr><td style="padding: 50px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;"><h1 style="margin: 0; font-size: 32px;">Welcome! 👋</h1></td></tr><tr><td style="padding: 40px 30px;"><p style="color: #333; line-height: 1.8;">Hi {{firstName}}, thank you for signing up!</p><div style="text-align: center; margin: 30px 0;"><a href="{{getStartedLink}}" style="display: inline-block; padding: 12px 40px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px;">Get Started</a></div></td></tr></table></body></html>`],
];

for (const [name, category, subject, html] of templates) {
  db.run(
    `INSERT OR IGNORE INTO templates (name, category, subject, html_content, is_preset) VALUES (?, ?, ?, ?, 1)`,
    [name, category, subject, html]
  );
}

// Update contact counts in lists
db.run(`UPDATE lists SET contact_count = (SELECT COUNT(*) FROM contacts WHERE list_id = lists.id)`);

// Seed default admin user
// Hash is bcryptjs cost-4 of 'freehold2026' — pre-computed to avoid blocking build on slow CPU.
// Cost 4 is used because the free Render tier (0.1 CPU) makes cost 6+ take 20+ seconds.
// To regenerate: node -e "import('bcryptjs').then(({default:b}) => console.log(b.hashSync('freehold2026', 4)))"
const adminHash = '$2a$04$yexHUh55JekXmYtXzDeWmuQiPRvu3nNgAgKxmDTy3Nw6MAenTXDta';
db.run(
  `INSERT OR IGNORE INTO users (email, password_hash, name) VALUES (?, ?, ?)`,
  ['admin@freehold.local', adminHash, 'Admin']
);

console.log('✓ Default admin user seeded');
console.log('  Email: admin@freehold.local');
console.log('  Password: freehold2026');
console.log('✓ Sample data seeded: 3 lists, 5 contacts, 5 templates');

// Save to disk
const data = db.export();
fs.writeFileSync(dbPath, Buffer.from(data));
db.close();
console.log('✓ Database saved to', dbPath);
