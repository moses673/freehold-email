# Freehold Email - Quick Start Guide

Get Freehold Email running in 5 minutes.

## Prerequisites
- Node.js 18+ installed
- Postmark account (optional, for email sending)

## Setup

### Step 1: Install Dependencies (1 min)
```bash
npm install
```

### Step 2: Configure Environment (30 sec)
```bash
cp .env.example .env
```

**Edit `.env`** and set:
- `POSTMARK_API_KEY=your_key_here` (optional, get from postmarkapp.com)
- `POSTMARK_FROM_EMAIL=noreply@example.com` (verified sender email)

### Step 3: Initialize Database (1 min)
```bash
npm run db:init
npm run db:seed
```

This creates the database with sample data:
- 3 contact lists
- 5 sample contacts
- 10 email templates
- Ready to test campaigns

### Step 4: Start Development (1 min)
```bash
npm run dev
```

Two servers start:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

---

## Testing the App

### 1. Contacts Page
- View 5 sample contacts
- Click "Import CSV" to import more
- Create new lists
- Search and filter contacts

### 2. Templates Page
- Browse 10 pre-built email templates
- Select a template and click Preview
- See live preview with demo variables
- Edit text, colors, links

### 3. Campaigns Page
- Click "New Campaign"
- Select a template
- Customize subject line
- Choose recipient list
- Preview before sending
- Click "Send Campaign"

**Note:** Sending requires valid Postmark API key in `.env`

---

## Common Tasks

### Import CSV
Format your CSV with columns: `email, first_name, last_name, tags`

```csv
email,first_name,last_name,tags
john@example.com,John,Doe,vip;premium
jane@example.com,Jane,Smith,active
```

Upload via Contacts → Import CSV

### Create New Template
Currently, templates are pre-built in the database. To add custom templates:

1. Update `scripts/seed-db.js` to add more templates
2. Re-run: `npm run db:init && npm run db:seed`

### Test Email Sending
1. Add Postmark API key to `.env`
2. Create a campaign
3. Select "Sent" status template
4. Choose recipient list
5. Preview and send

Emails will be sent via Postmark in batches.

---

## Troubleshooting

### "Cannot find module 'better-sqlite3'"
```bash
npm install
npm rebuild
```

### "Database is locked"
SQLite database is in use by another process. Restart dev servers.

### "Port 5000 already in use"
Change `SERVER_PORT` in `.env` to another port.

### "POSTMARK_API_KEY not set"
Email sending is disabled. To enable:
1. Get free account at postmarkapp.com
2. Add API key to `.env`
3. Verify sender email in Postmark dashboard
4. Restart server

### Database missing
```bash
npm run db:init
npm run db:seed
```

---

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start both servers (frontend + backend) |
| `npm run server:dev` | Start backend only (auto-reload) |
| `npm run client:dev` | Start frontend only (Vite) |
| `npm run db:init` | Create database schema |
| `npm run db:seed` | Populate sample data |
| `npm run client:build` | Build frontend for production |

---

## API Examples

### Get Contacts
```bash
curl http://localhost:5000/api/contacts
```

### Create Contact
```bash
curl -X POST http://localhost:5000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "tags": ["test"]
  }'
```

### Get Templates
```bash
curl http://localhost:5000/api/templates
```

### Preview Template
```bash
curl -X POST http://localhost:5000/api/templates/preview \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "variables": {
      "firstName": "John",
      "discount": "25"
    }
  }'
```

### Create Campaign
```bash
curl -X POST http://localhost:5000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Sale",
    "template_id": 1,
    "list_id": 1,
    "subject": "25% Off Summer Sale!",
    "html_content": "<p>Check out our summer deals...</p>"
  }'
```

### Send Campaign
```bash
curl -X POST http://localhost:5000/api/campaigns/1/send
```

---

## Next Steps

1. **Explore the UI** - Click through all pages
2. **Import test data** - Add your own contacts
3. **Create a campaign** - Send a test email
4. **Configure Postmark** - Enable live email sending
5. **Check STATUS.md** - See what's next for Sprint 2

---

## Support

See `README.md` for full documentation.
See `STATUS.md` for what's complete and what's planned.

**Questions?** Check the console output or browser dev tools for errors.
