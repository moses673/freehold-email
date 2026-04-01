# Freehold Email - MVP

One-time-purchase email marketing tool for small businesses. Send professional campaigns with built-in templates, contact management, and Postmark integration.

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Postmark account (free tier available)

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Postmark API key and settings
```

3. Initialize the database:
```bash
npm run db:init
npm run db:seed
```

4. Start development servers (backend on port 5000, frontend on port 5173):
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
freehold-email/
├── server/                 # Express backend
│   ├── index.js           # Server entry point
│   ├── db.js              # Database initialization
│   ├── routes/
│   │   ├── contacts.js    # Contact CRUD + CSV
│   │   ├── lists.js       # List management
│   │   ├── templates.js   # Email template endpoints
│   │   └── campaigns.js   # Campaign creation & sending
│   ├── services/
│   │   ├── email.js       # Postmark integration
│   │   └── csv.js         # CSV parsing/export utilities
│   └── middleware/
│       └── errorHandler.js
├── client/                # React + Vite frontend
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx       # Entry point
│   │   ├── App.jsx        # Main app component
│   │   ├── pages/
│   │   │   ├── ContactsPage.jsx
│   │   │   ├── TemplatesPage.jsx
│   │   │   └── CampaignPage.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── TemplateEditor.jsx
│   │   │   ├── ContactsTable.jsx
│   │   │   └── CampaignFlow.jsx
│   │   ├── hooks/
│   │   │   └── useApi.js  # API client hook
│   │   └── styles/
│   │       └── index.css
│   └── tailwind.config.js
├── shared/                # Shared types/constants
│   └── templates.js       # Template definitions
├── scripts/
│   ├── init-db.js        # Database schema setup
│   └── seed-db.js        # Sample data
├── data/                  # SQLite database (generated)
├── .env.example
├── .gitignore
└── README.md
```

## Core Features (MVP)

### 1. Contact Management
- Add/edit/delete contacts
- Organize into lists and tags
- CSV import/export
- Search and filter

### 2. Email Templates
- 10 pre-built templates (promotional, newsletter, announcement, thank you, welcome)
- Live preview editor
- Customize text, colors, and images
- Table-based HTML for compatibility

### 3. Campaign Creation
- Template selection with customization
- List/segment selection
- Preview before sending
- One-click send via Postmark
- Draft/scheduled/sent status tracking

### 4. Email Sending
- Postmark API integration
- Rate limiting (prevent mass-blast)
- Delivery tracking
- Bounce handling (basic)

## Database Schema

### contacts
- id (primary key)
- email (unique)
- first_name
- last_name
- list_id (foreign key)
- tags (JSON string)
- created_at
- updated_at

### lists
- id (primary key)
- name
- description
- contact_count
- created_at

### templates
- id (primary key)
- name
- category
- subject
- html_content
- created_at

### campaigns
- id (primary key)
- name
- template_id
- list_id
- subject
- html_content (customized)
- status (draft, scheduled, sent)
- recipients_count
- created_at
- sent_at
- updated_at

## API Endpoints

### Contacts
- `GET /api/contacts` - List contacts (paginated)
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/import` - Bulk import from CSV
- `GET /api/contacts/export` - Export to CSV

### Lists
- `GET /api/lists` - List all contact lists
- `POST /api/lists` - Create list
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list

### Templates
- `GET /api/templates` - List all templates
- `GET /api/templates/:id` - Get template details
- `POST /api/templates/preview` - Preview template with vars

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign (draft)
- `GET /api/campaigns/:id` - Get campaign
- `PUT /api/campaigns/:id` - Update campaign
- `POST /api/campaigns/:id/send` - Send campaign
- `GET /api/campaigns/:id/preview` - Preview campaign

## Development Notes

### Adding a New Contact List
```bash
curl -X POST http://localhost:5000/api/lists \
  -H "Content-Type: application/json" \
  -d '{"name":"My List","description":"Test list"}'
```

### Importing Contacts from CSV
Supported columns: email, first_name, last_name, tags
```bash
# Use the UI or POST to /api/contacts/import with form-data
```

### Testing Templates Locally
Navigate to http://localhost:5173/templates to see all pre-built templates with live preview editor.

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| NODE_ENV | No | development | Set to 'production' for deployment |
| SERVER_PORT | No | 5000 | Backend port |
| CLIENT_URL | Yes | http://localhost:5173 | CORS configuration |
| DB_PATH | No | ./data/freehold.db | SQLite database location |
| POSTMARK_API_KEY | Yes | - | Get from Postmark dashboard |
| POSTMARK_FROM_EMAIL | Yes | - | Verified sender email in Postmark |
| VITE_API_URL | No | http://localhost:5000 | Frontend API base URL |

## Next Steps (Sprint 2)

- Email delivery tracking (opens, clicks)
- Advanced segmentation and automation
- Drag-and-drop template builder
- Subscription/recurring campaigns
- Analytics dashboard
- Multi-user support with authentication
- Custom domain support
- A/B testing
- Scheduled send (cron jobs)

## Troubleshooting

### "Cannot find module 'better-sqlite3'"
```bash
npm install && npm rebuild
```

### Port already in use
```bash
# Change SERVER_PORT in .env or kill the process
lsof -i :5000
```

### Postmark API errors
- Verify API key in .env
- Check sender email is verified in Postmark
- Test with Postmark's validation endpoint

## License

Freehold Email - Proprietary MVP
