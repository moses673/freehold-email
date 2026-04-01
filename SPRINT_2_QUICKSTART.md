# Sprint 2 Features - Quick Start Guide

## Getting Started

After updating from Sprint 1, follow these steps to activate Sprint 2 features:

### 1. Initialize Database Schema

Run this once to add the new tables and columns:

```bash
npm run db:init
```

This will:
- Create the `events` table (for webhook tracking)
- Add `welcome_template_id` column to `lists` table
- Create all necessary indexes

**Note:** If you have existing data, this is safe - it uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

### 2. Start the Server

```bash
npm run dev
```

Server will start on http://localhost:5000
Client will be available on http://localhost:5173

---

## Feature 1: Analytics Dashboard

### Access It
- Click **Analytics** button in navbar
- URL: Dashboard loads when page is selected

### What You'll See
1. **Overview Cards** - Top KPIs:
   - Total Contacts (all time)
   - Contact Lists count
   - Campaigns Sent (count)
   - Total Emails Sent

2. **7-Day Summary** - Last 7 days metrics:
   - Emails sent
   - Opens + open rate %
   - Clicks + click rate %
   - Bounces

3. **Campaign Performance Table** - Last 90 days:
   - Campaign name and status
   - Recipients and sent count
   - Opens, clicks, bounces (counts)
   - Open rate & click rate %
   - Click a row to filter events by campaign

4. **Recent Events** - Email engagement:
   - Event type (delivery, open, click, bounce, etc.)
   - Recipient email
   - Message ID
   - Timestamp
   - Filter by event type

### Where Data Comes From
- **Counts:** `campaigns`, `contacts`, `campaign_sends` tables
- **Events:** `events` table (populated by Postmark webhooks)
- **Performance:** Real-time aggregation from events

---

## Feature 2: Welcome Automation

### Set Up a Welcome Email

1. Go to **Contacts** page
2. In the "Contact Lists" sidebar, select a list
3. Click **"Configure Welcome Email"** button
4. A modal appears with all available templates
5. Select a template and click **"Save Welcome Template"**
6. The list now shows "✓ Welcome email configured"

### How It Works
- When you add a new contact to that list, they automatically receive the welcome email
- The email is sent asynchronously (doesn't delay contact creation)
- Works for both:
  - Individual contact creation: `POST /api/contacts`
  - Bulk import from CSV: `POST /api/contacts/import`

### Example Workflow
1. Create a list called "Newsletter Subscribers"
2. Configure a welcome template (e.g., "Welcome to Our Newsletter")
3. Import 100 contacts from CSV into that list
4. Each of the 100 contacts automatically receives the welcome email
5. Check Postmark logs to verify delivery

---

## Feature 3: Postmark Webhooks

### Configure in Postmark Account
1. Log in to https://postmarkapp.com
2. Go to **Account Settings** → **Webhooks**
3. Click **Add Webhook**
4. Webhook URL: `https://yourdomain.com/api/webhooks/postmark`
   - Replace `yourdomain.com` with your actual domain
   - Must use HTTPS in production
5. Event Types: Select all (Delivery, Open, Click, Bounce, Spam, Unsubscribe)
6. Click **Save**
7. Postmark will send a test webhook - you should see it accepted

### What Gets Tracked
When emails are sent:
- **Delivery** - Email accepted by recipient server
- **Open** - Recipient opened email
- **Click** - Recipient clicked a link
- **Bounce** - Email bounced (hard or soft)
- **Spam** - Recipient marked as spam
- **Unsubscribe** - Recipient clicked unsubscribe link

### View Events
- Go to **Analytics** → **Recent Events**
- See all tracked events in real-time
- Filter by event type
- Click campaign row to see events for specific campaign

### Debug Webhook
- Go to API: `GET /api/webhooks/postmark/status`
- Shows total events received and breakdown by type
- Useful for confirming webhooks are being received

---

## Feature 4: Domain Verification

### Why It Matters
Email authentication (SPF, DKIM, DMARC) is critical for:
- Emails reaching inbox (not spam folder)
- Proving emails are from you
- Preventing domain spoofing

### Access the Guide
- Click **Domain Setup** button in navbar
- Interactive guide with copy-pasteable DNS records

### Setup Steps
1. **Enter Your Domain** - e.g., "example.com"
2. **Copy SPF Record** - Add to DNS at your registrar
3. **Copy DKIM Key** - Get from Postmark, add to DNS
4. **Copy DMARC Policy** - Add at `_dmarc.yourdomain.com`
5. **Wait 24-48 hours** - For DNS propagation
6. **Test** - Send test email and check headers

### Quick DNS Registrar Guides
- **GoDaddy** - Go to DNS Zone Editor
- **Namecheap** - Dashboard → Domain → Manage
- **DigitalOcean** - Networking → Domains
- **CloudFlare** - DNS tab

### Verify It's Working
```bash
# Command line check (macOS/Linux)
dig yourdomain.com TXT          # Check SPF record
dig default._domainkey.yourdomain.com TXT  # Check DKIM
dig _dmarc.yourdomain.com TXT   # Check DMARC
```

Or use online tools:
- **MXToolbox** - https://mxtoolbox.com - Check all records
- **DMARC Analyzer** - https://dmarcian.com - Monitor DMARC

---

## API Endpoints Added

### Analytics
```
GET /api/analytics/overview              # Total stats
GET /api/analytics/summary               # 7-day metrics
GET /api/analytics/campaign-performance  # Campaign performance
GET /api/analytics/events                # Event stream
```

### Webhooks
```
POST /api/webhooks/postmark              # Receive webhook
GET  /api/webhooks/postmark/status       # Status check
```

### Lists (Welcome Templates)
```
GET  /api/lists/:id/welcome-template     # Get current template
PUT  /api/lists/:id/welcome-template     # Set template
```

### Contacts (Enhanced)
```
POST /api/contacts                       # Now triggers welcome email
```

---

## Testing the Features

### Test Analytics
1. Create a campaign
2. Send to 5 test contacts
3. Go to Analytics dashboard
4. Should see emails in "Campaign Performance" table
5. (Events appear once Postmark webhook is configured)

### Test Welcome Automation
1. Create a list: "Test Welcome List"
2. Configure welcome template
3. Add a new contact to that list
4. Check your email inbox (or Postmark logs)
5. Should receive welcome email

### Test Webhooks
1. Configure webhook in Postmark
2. Send a test campaign
3. Wait 10 seconds
4. Go to Analytics → Recent Events
5. Should see "delivery" event for test email
6. Open the email in a client
7. Should see "open" event appear in Analytics

### Test Domain Verification
1. Go to Domain Setup page
2. Copy SPF record
3. Add to your domain's DNS (in registrar)
4. Wait 1 hour for propagation
5. Use MXToolbox to verify SPF passes
6. Repeat for DKIM and DMARC

---

## Common Issues

### "No events showing in Analytics"
- **Problem:** Webhooks not configured in Postmark
- **Solution:** Add webhook endpoint in Postmark account settings
- **Check:** Use `GET /api/webhooks/postmark/status` endpoint

### "Welcome email not sending"
- **Problem:** No template selected for list
- **Solution:** Click "Configure Welcome Email" on list, select template
- **Check:** Verify `welcome_template_id` is set in database

### "Emails going to spam"
- **Problem:** Domain not verified
- **Solution:** Add SPF, DKIM, DMARC records to DNS
- **Check:** Use MXToolbox to verify all records pass

### "Database error on db:init"
- **Problem:** Schema already exists
- **Solution:** Safe to run again - uses IF NOT EXISTS
- **Check:** Look for error messages in console

---

## Environment Variables Needed

For full functionality:
```env
# Required for email sending
POSTMARK_API_KEY=your_key_here
POSTMARK_FROM_EMAIL=noreply@yourdomain.com

# Already set from Sprint 1
NODE_ENV=development
SERVER_PORT=5000
CLIENT_URL=http://localhost:5173
```

---

## Database Schema - New Tables

### events Table
```sql
- id (PK)
- event_type (delivery, open, click, bounce, spam, unsubscribe)
- message_id (links to Postmark)
- campaign_id (FK to campaigns)
- contact_id (FK to contacts)
- email (from email)
- recipient (to email)
- metadata (full webhook payload as JSON)
- created_at, received_at
- Indexes on: type, message_id, campaign_id, contact_id, created_at
```

### lists Table (Updated)
```sql
- Added: welcome_template_id (FK to templates, nullable)
```

---

## Next Steps

After Sprint 2:
1. Configure your domain authentication (SPF, DKIM, DMARC)
2. Set up Postmark webhooks
3. Configure welcome templates for your lists
4. Monitor analytics dashboard as you send campaigns

Recommended testing order:
1. Test analytics with a sample campaign
2. Test welcome automation with test contacts
3. Test webhooks with Postmark test button
4. Test domain verification with a real email client

---

## Support

If you run into issues:
1. Check the console for error messages
2. Verify database was initialized: `npm run db:init`
3. Check Postmark logs for webhook failures
4. Review error messages in browser developer tools
5. Check API response codes (200, 202, 404, 500)

---

**Sprint 2 is ready to go! Start with the Analytics dashboard to see your email campaigns in action.**
