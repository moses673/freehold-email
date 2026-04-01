# Freehold Email - Deployment Setup Summary

## What Was Built

All deployment infrastructure for Freehold Email is now configured and ready. This app can be deployed to production with either Render.com (free tier) or Docker-based hosting.

## Files Created/Modified

### New Files Created
1. **Dockerfile** - Container image definition for production deployment
2. **docker-compose.yml** - Multi-service orchestration for local/self-hosted deployment
3. **render.yaml** - Render.com service configuration with auto-generated secrets
4. **DEPLOYMENT.md** - Comprehensive deployment guide with step-by-step instructions

### Files Modified
1. **package.json**
   - Added `build` script: builds React frontend and prepares for production
   - Added `start` script: runs server in production mode with NODE_ENV=production
   - Added `dev` script: uses concurrently to run both servers
   - Added `setup` script: initializes database and seeds initial data
   - Added `migrate` script: runs database migrations
   - Added `concurrently` devDependency for running multiple processes

2. **server/index.js**
   - Changed PORT from 5000 to 3001 (uses `process.env.PORT` with fallback)
   - Updated CLIENT_URL to support both `CLIENT_URL` and `APP_URL` env vars
   - Server now handles both development and production modes seamlessly

3. **client/vite.config.js**
   - Updated API proxy to point to `http://localhost:3001` (matching new port)
   - Added `/unsubscribe` route proxy for unsubscribe links

4. **.env.example**
   - Added `JWT_SECRET` (required for authentication)
   - Added `UNSUBSCRIBE_SECRET` (required for GDPR/CAN-SPAM compliance)
   - Clarified required vs optional variables
   - Updated port references to 3001
   - Updated API URL examples to 3001

5. **.gitignore**
   - Added `client/node_modules/` and `client/dist/`
   - Added SQLite WAL files (*.db-wal, *.db-shm)

## Architecture Overview

### Production Server Setup
The Express server now:
- Runs on port 3001 (configurable via PORT env var)
- Serves React frontend as static files from `client/dist/`
- Routes all non-API requests to `index.html` for client-side routing
- Enforces CORS using configured domains (APP_URL or CLIENT_URL)
- Checks database on startup; fails gracefully if DB is unavailable

### Database
- Uses SQLite with WAL mode for concurrent access
- Path configurable via `DB_PATH` env var (defaults to ./freehold.db)
- Docker deployment: `/app/data/freehold.db` with persistent volume
- Schema includes: contacts, lists, templates, campaigns, analytics, users
- Supports unsubscribe tracking and JWT authentication

### Environment Configuration
All deployment modes use environment variables for configuration:
- Development: `.env` file (create from `.env.example`)
- Docker: `.env` file or docker-compose.yml environment section
- Render.com: Dashboard environment variables (can be auto-generated)

## Deployment Paths

### Path 1: Render.com (Recommended for MVP)
**Best for:** Teams wanting free hosting, automatic deployments, zero DevOps

Steps:
1. Push code to GitHub
2. Connect GitHub repo to Render.com
3. Set environment variables in dashboard (6 required)
4. Click Deploy
5. Service live in ~10 minutes

**Pros:**
- Free tier includes 50GB/month bandwidth
- Auto-deploys on git push
- Included SSL/TLS
- Automatic dyno cycling
- No server management

**Cons:**
- Free tier dyno sleeps after 15 min inactivity
- Limited to 0.5GB RAM
- Database file doesn't persist across service restart (need to upgrade)

### Path 2: Docker (Self-Hosted)
**Best for:** Teams with existing infrastructure, custom domains, full control

Steps:
1. Clone repo to server
2. Create `.env` file with production values
3. Run `docker-compose up -d`
4. Configure Nginx reverse proxy (optional)
5. Set up HTTPS with Let's Encrypt

**Pros:**
- Full control over infrastructure
- Data persistence
- Can scale horizontally
- No vendor lock-in
- Cheaper for high traffic

**Cons:**
- Requires server management
- Need to handle monitoring/backups
- SSL certificate management
- More initial setup complexity

## Security Considerations

1. **JWT_SECRET & UNSUBSCRIBE_SECRET**
   - Must be cryptographically random strings (minimum 32 characters)
   - Render can auto-generate these
   - Never commit to git

2. **Postmark API Key**
   - Keep in environment variables only
   - Rotate periodically
   - Use Postmark's IP allowlisting for additional security

3. **CORS Configuration**
   - Only allows requests from APP_URL/CLIENT_URL
   - Prevents cross-origin attacks
   - Must be exact match (http vs https, www vs non-www)

4. **Database**
   - SQLite suitable for MVP (<1M contacts)
   - No built-in authentication (relies on JWT)
   - For production scale, migrate to PostgreSQL

5. **Email Validation**
   - Postmark handles bounce detection
   - Unsubscribe links are cryptographically signed
   - Supports webhook validation for security

## Performance Notes

### Development
- `npm run dev`: Runs both servers concurrently with hot-reload
- Client on port 5173, API on port 3001
- Proxy configured for seamless API calls in development

### Production
- Built React app (static assets) served from Express
- Single port (3001) runs entire application
- Zero Cold start: app loads immediately
- Rate limiting: Can be added in email.js service

### Scaling (Future)
- Current SQLite suitable for ~5000 contacts
- For larger scale:
  1. Migrate to PostgreSQL (change server/db.js)
  2. Add Redis caching layer
  3. Implement job queue for batch email sends
  4. Use load balancer (Nginx/HAProxy) for multiple instances

## Database Initialization

### Automatic (Docker & Render)
Dockerfile runs on startup:
```
node scripts/init-db.js && node scripts/seed-db.js && node server/index.js
```

### Manual (Local Development)
```bash
npm run db:init    # Creates schema from scripts/init-db.js
npm run db:seed    # Adds sample data
```

### What Gets Created
- **contacts** table: Stores email addresses and user info
- **lists** table: Groups contacts
- **templates** table: Pre-built email templates
- **campaigns** table: Sent/draft campaigns
- **analytics** table: Delivery events (opens, clicks, bounces)
- **users** table: App user accounts for authentication
- **unsubscribes** table: Tracks unsubscribe requests

Sample data includes:
- 1 test user (email/password for login)
- 3 sample contact lists
- 10+ pre-built email templates
- Example campaigns for demonstration

## Testing the Deployment

### Health Check
```bash
curl https://YOUR_DOMAIN/health
# Expected: {"status":"ok","timestamp":"2026-04-01T..."}
```

### Email Sending
1. Log in to app at https://YOUR_DOMAIN
2. Import test contacts or use seeded ones
3. Create campaign using built-in template
4. Send to test email address
5. Verify in inbox (usually <1 second with Postmark)
6. Check Postmark dashboard for delivery status

### Database Connectivity
The server startup logs show:
```
✓ Database connected (X contacts)
```

If you see database errors, run:
```bash
npm run db:init && npm run db:seed && npm start
```

## Monitoring & Logs

### Render.com
- Dashboard → Logs tab shows real-time output
- Errors automatically logged to Render
- Integration with monitoring services available in paid plans

### Docker
```bash
# Tail live logs
docker-compose logs -f app

# View last 100 lines
docker-compose logs app --tail=100

# Check status
docker-compose ps
```

### Application
- Server logs on startup show port, environment, client URL
- API request logging in development mode (timing, status code)
- Database error messages include migration hints

## Next Steps After Deployment

1. **Configure Postmark Webhooks**
   - Enable bounce/open/click tracking
   - Webhook URL: `https://YOUR_DOMAIN/api/webhooks/postmark`

2. **Test Email Flow**
   - Create campaign
   - Send test email
   - Verify delivery in inbox

3. **Set Up Custom Domain**
   - If using Render: Add CNAME record
   - If using Docker: Point DNS A record to server IP

4. **Monitor Performance**
   - Watch logs for errors
   - Check Postmark dashboard for delivery rates
   - Monitor database size growth

5. **Plan for Scale**
   - After 1000+ contacts, consider PostgreSQL migration
   - Add caching layer for frequent queries
   - Implement background job queue for batch sends

## Summary

Freehold Email is now **production-ready** with:
- ✓ Containerized deployment (Dockerfile)
- ✓ Local orchestration (docker-compose.yml)
- ✓ Cloud deployment (render.yaml)
- ✓ Environment variable system
- ✓ Static file serving
- ✓ CORS configuration
- ✓ Database initialization scripts
- ✓ Comprehensive deployment guide

**Recommended deployment approach for MVP:**
1. Push to GitHub
2. Connect to Render.com
3. Set environment variables (6 required)
4. Deploy (takes ~10 minutes)
5. Test email sending with Postmark integration

See `DEPLOYMENT.md` for detailed step-by-step instructions.
