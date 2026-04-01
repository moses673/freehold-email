import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/freehold.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Seed sample lists
const listsStmt = db.prepare(`
  INSERT OR IGNORE INTO lists (name, description)
  VALUES (?, ?)
`);

listsStmt.run('Subscribers', 'General mailing list');
listsStmt.run('VIP Customers', 'High-value customers');
listsStmt.run('Trial Users', 'Free trial signups');

// Seed sample contacts
const contactsStmt = db.prepare(`
  INSERT OR IGNORE INTO contacts (email, first_name, last_name, list_id, tags)
  VALUES (?, ?, ?, ?, ?)
`);

const subscribersListId = db.prepare('SELECT id FROM lists WHERE name = ?').get('Subscribers').id;
const vipListId = db.prepare('SELECT id FROM lists WHERE name = ?').get('VIP Customers').id;

contactsStmt.run('alice@example.com', 'Alice', 'Johnson', subscribersListId, '["active"]');
contactsStmt.run('bob@example.com', 'Bob', 'Smith', subscribersListId, '["active"]');
contactsStmt.run('carol@example.com', 'Carol', 'White', vipListId, '["vip","premium"]');
contactsStmt.run('dave@example.com', 'Dave', 'Brown', vipListId, '["vip","engaged"]');
contactsStmt.run('eve@example.com', 'Eve', 'Davis', subscribersListId, '["inactive"]');

// Seed email templates
const templatesStmt = db.prepare(`
  INSERT OR IGNORE INTO templates (name, category, subject, html_content, is_preset)
  VALUES (?, ?, ?, ?, 1)
`);

// Promotional Template
templatesStmt.run('Summer Sale 2024', 'promotional', 'Limited Time: {{discountPercent}}% Off Everything!', `<html><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
<table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  <tr><td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 32px;">{{discountPercent}}% OFF</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px;">Everything in Store</p>
  </td></tr>
  <tr><td style="padding: 40px 30px;">
    <h2 style="color: #333; margin-top: 0;">Dear {{firstName}},</h2>
    <p style="color: #666; line-height: 1.6;">This is a limited-time offer just for you. Browse our full collection and save {{discountPercent}}% on your entire purchase.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{shopLink}}" style="display: inline-block; padding: 12px 40px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Shop Now</a>
    </div>
    <p style="color: #999; font-size: 12px; text-align: center;">Offer valid until {{expiryDate}}</p>
  </td></tr>
</table>
</body></html>`);

// Newsletter Template
templatesStmt.run('Monthly Newsletter', 'newsletter', 'Your {{monthYear}} Update', `<html><body style="font-family: Georgia, serif; margin: 0; padding: 20px; background-color: #f9f9f9;">
<table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white;">
  <tr><td style="padding: 30px; border-bottom: 4px solid #2c3e50;">
    <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">{{monthYear}} Newsletter</h1>
  </td></tr>
  <tr><td style="padding: 30px;">
    <h2 style="color: #34495e; font-size: 20px;">Featured Article</h2>
    <p style="color: #555; line-height: 1.8; margin: 0 0 20px 0;">{{articlePreview}}</p>
    <a href="{{articleLink}}" style="color: #2980b9; text-decoration: none;">Read Full Article →</a>
  </td></tr>
  <tr><td style="padding: 0 30px 30px 30px; border-top: 1px solid #ecf0f1;">
    <h3 style="color: #34495e; font-size: 16px; margin-top: 30px;">This Month's Highlights</h3>
    <ul style="color: #555; line-height: 1.8;">
      <li>{{highlight1}}</li>
      <li>{{highlight2}}</li>
      <li>{{highlight3}}</li>
    </ul>
  </td></tr>
</table>
</body></html>`);

// Announcement Template
templatesStmt.run('Product Launch', 'announcement', '🎉 Introducing {{productName}}', `<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #fff;">
<table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto;">
  <tr><td style="padding: 40px 30px; text-align: center; background-color: #f0f4ff; border-radius: 8px;">
    <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
    <h1 style="color: #1a3a52; margin: 0 0 10px 0; font-size: 28px;">{{productName}} is Here!</h1>
    <p style="color: #555; margin: 0; font-size: 16px;">We're excited to share our newest creation with you.</p>
  </td></tr>
  <tr><td style="padding: 30px;">
    <p style="color: #666; line-height: 1.7;">Hi {{firstName}},</p>
    <p style="color: #666; line-height: 1.7;">{{announcementDetails}}</p>
    <div style="background-color: #f8f8f8; padding: 20px; border-left: 4px solid #007acc; margin: 20px 0;">
      <strong style="color: #007acc;">Key Features:</strong><br>
      {{features}}
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{learnMoreLink}}" style="display: inline-block; padding: 14px 48px; background-color: #007acc; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Learn More</a>
    </div>
  </td></tr>
</table>
</body></html>`);

// Thank You Template
templatesStmt.run('Thank You for Purchase', 'thank you', 'Order Confirmation - {{orderNumber}}', `<html><body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
<table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px;">
  <tr><td style="padding: 30px; text-align: center; border-bottom: 2px solid #10b981;">
    <h2 style="color: #1f2937; margin: 0; font-size: 24px;">✓ Thank You!</h2>
    <p style="color: #6b7280; margin: 5px 0 0 0;">Order #{{orderNumber}}</p>
  </td></tr>
  <tr><td style="padding: 30px;">
    <p style="color: #374151; line-height: 1.6;">Hi {{firstName}},</p>
    <p style="color: #374151; line-height: 1.6;">Thank you for your purchase. We've received your order and will begin processing it right away.</p>
    <h3 style="color: #1f2937; margin-top: 30px; margin-bottom: 15px;">Order Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="background-color: #f9fafb;">
        <td style="padding: 10px; color: #374151; border: 1px solid #e5e7eb;">Order Total</td>
        <td style="padding: 10px; color: #374151; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">{{total}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; color: #374151; border: 1px solid #e5e7eb;">Estimated Delivery</td>
        <td style="padding: 10px; color: #374151; border: 1px solid #e5e7eb; text-align: right;">{{estimatedDelivery}}</td>
      </tr>
    </table>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{trackingLink}}" style="display: inline-block; padding: 12px 36px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">Track Order</a>
    </div>
  </td></tr>
</table>
</body></html>`);

// Welcome Template
templatesStmt.run('Welcome to Our Community', 'welcome', 'Welcome aboard, {{firstName}}!', `<html><body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
<table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden;">
  <tr><td style="padding: 50px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
    <h1 style="margin: 0; font-size: 32px;">Welcome! 👋</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">We're thrilled to have you join our community</p>
  </td></tr>
  <tr><td style="padding: 40px 30px;">
    <p style="color: #333; line-height: 1.8; font-size: 16px;">Hi {{firstName}},</p>
    <p style="color: #555; line-height: 1.8;">Thank you for signing up! You're now part of our growing community. Here's what you can do next:</p>
    <div style="background-color: #f0f4ff; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; color: #333;"><strong>Getting Started:</strong></p>
      <ul style="color: #555; padding-left: 20px; line-height: 1.8;">
        <li>Complete your profile</li>
        <li>Explore our features</li>
        <li>Check out our help center</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{getStartedLink}}" style="display: inline-block; padding: 12px 40px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Get Started</a>
    </div>
    <p style="color: #999; font-size: 13px; text-align: center; margin-top: 30px;">Have questions? Reply to this email or visit our <a href="{{helpLink}}" style="color: #667eea;">help center</a>.</p>
  </td></tr>
</table>
</body></html>`);

// Additional templates
templatesStmt.run('Flash Sale Alert', 'promotional', '⚡ Flash Sale: {{discount}}% Off for {{hours}} Hours!', `<html><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #fff;">
<table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border: 3px solid #ff6b6b; border-radius: 8px;">
  <tr><td style="padding: 30px; background-color: #ff6b6b; color: white; text-align: center;">
    <h1 style="margin: 0; font-size: 40px;">⚡ {{discount}}% OFF</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px;">For {{hours}} Hours Only!</p>
  </td></tr>
  <tr><td style="padding: 30px; text-align: center;">
    <p style="color: #666; font-size: 16px; margin: 0 0 20px 0;">Don't miss out on these incredible deals!</p>
    <a href="{{shopLink}}" style="display: inline-block; padding: 14px 50px; background-color: #ff6b6b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Shop Now Before It's Gone!</a>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">Countdown: {{hoursRemaining}} hours left</p>
  </td></tr>
</table>
</body></html>`);

templatesStmt.run('Event Invitation', 'announcement', 'You\'re Invited: {{eventName}}', `<html><body style="font-family: 'Trebuchet MS', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
<table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px;">
  <tr><td style="padding: 40px 30px; background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%); color: white; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">{{eventName}}</h1>
    <p style="margin: 5px 0 0 0; font-size: 14px;">You're Invited! 🎊</p>
  </td></tr>
  <tr><td style="padding: 30px;">
    <p style="color: #333; line-height: 1.7;">Hi {{firstName}},</p>
    <p style="color: #555; line-height: 1.7;">We'd love for you to join us for an exciting event!</p>
    <div style="background-color: #f0f8ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4facfe;">
      <p style="margin: 0; color: #333;"><strong>📅 Date:</strong> {{eventDate}}</p>
      <p style="margin: 5px 0 0 0; color: #333;"><strong>🕐 Time:</strong> {{eventTime}}</p>
      <p style="margin: 5px 0 0 0; color: #333;"><strong>📍 Location:</strong> {{eventLocation}}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{rsvpLink}}" style="display: inline-block; padding: 12px 40px; background-color: #4facfe; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">RSVP Now</a>
    </div>
  </td></tr>
</table>
</body></html>`);

templatesStmt.run('Re-engagement Campaign', 'promotional', 'We miss you! Here\'s {{incentive}} to come back', `<html><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #fff5e6;">
<table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px;">
  <tr><td style="padding: 40px 30px; text-align: center;">
    <h1 style="color: #d97706; margin: 0; font-size: 26px;">We Miss You, {{firstName}}!</h1>
    <p style="color: #666; margin: 10px 0 0 0;">Come back and get {{incentive}}</p>
  </td></tr>
  <tr><td style="padding: 30px;">
    <p style="color: #555; line-height: 1.7;">It's been a while since we last saw you. We've missed having you around!</p>
    <p style="color: #555; line-height: 1.7;">As a token of appreciation, we're offering you {{incentive}} on your next purchase. This offer is exclusive to you and expires {{expiryDate}}.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{reactivationLink}}" style="display: inline-block; padding: 14px 48px; background-color: #d97706; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Claim Your Offer</a>
    </div>
  </td></tr>
</table>
</body></html>`);

// Update contact counts
db.prepare(`
  UPDATE lists SET contact_count = (
    SELECT COUNT(*) FROM contacts WHERE list_id = lists.id
  )
`).run();

// Seed default admin user (change password immediately in production)
const adminHash = bcryptjs.hashSync('freehold2026', 10);
try {
  db.prepare(`INSERT OR IGNORE INTO users (email, password_hash, name) VALUES (?, ?, ?)`).run(
    'admin@freehold.local',
    adminHash,
    'Admin'
  );
  console.log('✓ Default admin user created');
  console.log('  - Email: admin@freehold.local');
  console.log('  - Password: freehold2026');
  console.log('  - ⚠️  Change this password immediately in production!');
} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    console.log('✓ Admin user already exists');
  } else {
    throw error;
  }
}

console.log('✓ Database seeded with sample data');
console.log('  - 3 contact lists');
console.log('  - 5 sample contacts');
console.log('  - 10 email templates (promotional, newsletter, announcement, etc.)');

db.close();
