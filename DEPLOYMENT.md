# Freehold Email - Deployment Guide

This guide covers deploying Freehold Email to production using Render.com (recommended for free tier) or Docker.

## Prerequisites

- Postmark API Key (free tier available at postmark.com)
- Verified sender email in Postmark
- GitHub account with repository access
- Render.com account (free tier: https://render.com)

## Deployment Option 1: Render.com (Recommended)

### Step 1: Push Code to GitHub

1. Initialize Git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit: Freehold Email deployment"
git remote add origin https://github.com/YOUR_USERNAME/freehold-email.git
git push -u origin main
```

2. Ensure these files are in the repo:
   - `package.json` (with build/start/setup scripts)
   - `Dockerfile` (optional, for reference)
   - `render.yaml` (service configuration)
   - `.env.example` (without secrets)
   - `server/`, `client/`, `scripts/`, `shared/` directories

### Step 2: Create Render.com Account & Project

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository containing Freehold Email
5. Render will automatically detect the `render.yaml` configuration

### Step 3: Configure Environment Variables

In the Render dashboard, set these environment variables:

**Required:**
- `POSTMARK_API_KEY`: Your Postmark API key
- `JWT_SECRET`: Generate a random string (Render can auto-generate)
- `UNSUBSCRIBE_SECRET`: Generate another random string (Render can auto-generate)
- `APP_URL`: Your Render app URL (e.g., https://freehold-email.onrender.com)
- `CLIENT_URL`: Same as APP_URL (e.g., https://freehold-email.onrender.com)
- `POSTMARK_FROM_EMAIL`: Your verified sender email in Postmark

**Optional:**
- `PORT`: 3001 (default, usually not needed to change)
- `NODE_ENV`: production (default)

### Step 4: Deploy

1. Click "Deploy" in the Render dashboard
2. Monitor the build logs in real-time
3. Once deployed, your app will be live at `https://YOUR_SERVICE_NAME.onrender.com`

### Step 5: Verify Deployment

1. Visit your app URL: `https://YOUR_SERVICE_NAME.onrender.com`
2. Check `/health` endpoint: `https://YOUR_SERVICE_NAME.onrender.com/health`

Expected response:
```json
{"status":"ok","timestamp":"2026-04-01T12:00:00.000Z"}
```

## Deployment Option 2: Docker (Self-Hosted)

### Prerequisites for Docker Deployment

- Docker and Docker Compose installed
- Linux server (Ubuntu 20.04+ recommended)
- Domain name (optional, but recommended)

### Step 1: Prepare Server

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
sudo apt-get install -y docker.io docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Clone repository
git clone https://github.com/YOUR_USERNAME/freehold-email.git
cd freehold-email
```

### Step 2: Set Environment Variables

```bash
cp .env.example .env

# Edit .env with your production values
nano .env
```

Update these in `.env`:
```env
POSTMARK_API_KEY=your-actual-postmark-key
JWT_SECRET=your-random-secret-string-min-32-chars
UNSUBSCRIBE_SECRET=another-random-secret-string
APP_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
POSTMARK_FROM_EMAIL=noreply@yourdomain.com
PORT=3001
```

### Step 3: Build and Run with Docker Compose

```bash
# Build and start services
docker-compose up -d

# Check if running
docker-compose ps

# View logs
docker-compose logs -f app

# Verify health
curl http://localhost:3001/health
```

### Step 4: Setup Nginx Reverse Proxy (Optional but Recommended)

```bash
sudo apt-get install -y nginx

# Create nginx config
sudo tee /etc/nginx/sites-available/freehold > /dev/null <<EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/freehold /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Step 5: Setup HTTPS with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Post-Deployment Setup

### 1. Create First User Account

You can create a user account in two ways:

**Option A: Via API**
```bash
curl -X POST https://YOUR_DOMAIN/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "password": "securepassword123"
  }'
```

**Option B: Run seed script directly**
```bash
# For Docker
docker-compose exec app node scripts/seed-db.js

# For Render
render-exec node scripts/seed-db.js
```

### 2. Configure Postmark Webhooks

This enables delivery tracking and bounce handling:

1. Log in to Postmark Dashboard
2. Go to Servers → Your Server → Webhooks
3. Add a webhook with URL: `https://YOUR_DOMAIN/api/webhooks/postmark`
4. Select events: Message Bounced, Message Opened, Message Clicked
5. Click "Save Webhook"

Test the webhook in Postmark's interface to confirm it's working.

### 3. Verify Email Sending

1. Log in to your Freehold Email instance
2. Navigate to Campaigns
3. Create a test campaign
4. Send to a test email address
5. Verify it arrives in your inbox

## Environment Variables Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `POSTMARK_API_KEY` | Yes | - | Postmark API key for sending emails |
| `JWT_SECRET` | Yes | - | Secret for JWT authentication tokens |
| `UNSUBSCRIBE_SECRET` | Yes | - | Secret for unsubscribe link signing |
| `APP_URL` | Yes | - | Your app's public URL (production domain) |
| `CLIENT_URL` | Yes | - | Frontend URL for CORS (usually same as APP_URL) |
| `POSTMARK_FROM_EMAIL` | Yes | - | Verified sender email in Postmark |
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | production | Environment mode |
| `DB_PATH` | No | /app/data/freehold.db | SQLite database path |
| `SERVER_PORT` | No | 3001 | (Legacy, use PORT instead) |

## Monitoring & Maintenance

### Health Checks

```bash
# Check if service is up
curl https://YOUR_DOMAIN/health

# Check API connectivity
curl https://YOUR_DOMAIN/api/contacts -H "Authorization: Bearer YOUR_TOKEN"
```

### Viewing Logs

**Render.com:**
- Dashboard → Logs tab shows all output

**Docker:**
```bash
docker-compose logs -f app

# Specific service
docker-compose logs -f app --tail=100
```

### Database Backups

**Docker:**
```bash
# Backup database
docker-compose exec app cp /app/data/freehold.db /tmp/freehold-backup.db
docker cp CONTAINER_ID:/tmp/freehold-backup.db ./backup.db

# Restore from backup
docker cp ./backup.db CONTAINER_ID:/app/data/freehold.db
docker-compose restart
```

**Render.com:**
- Data persists in the disk (mounted volume)
- Render handles automatic backups in paid plans
- For free tier, periodically export data via API

### Scaling & Performance

**Docker:**
- For high traffic, implement load balancing (nginx, HAProxy)
- Use managed database (PostgreSQL on Render, RDS on AWS)
- Implement caching (Redis)

**Render.com:**
- Free tier: suitable for <1000 contacts and <5 campaigns/month
- For larger scale, upgrade to paid instance with more RAM
- Consider converting to PostgreSQL for multi-instance deployments

## Troubleshooting

### "Cannot start server without database"

The database initialization failed. This usually happens on first deploy.

**Solution:**
```bash
# For Render, restart the service from dashboard
# For Docker:
docker-compose exec app npm run db:init
docker-compose exec app npm run db:seed
docker-compose restart app
```

### "POSTMARK_API_KEY is not configured"

The API key environment variable is not set.

**Solution:**
1. Verify key is in .env file (Docker) or environment variables (Render)
2. Restart the service after adding the key
3. Check Postmark account still has valid API key

### Port Already In Use

If running locally or on a server where port 3001 is taken:

**Docker:**
```bash
# Change port in docker-compose.yml
ports:
  - "8080:3001"  # Access at localhost:8080
```

**Local:**
```bash
PORT=8080 npm start
```

### CORS Errors in Frontend

The CLIENT_URL environment variable doesn't match the domain you're visiting.

**Solution:**
1. Verify APP_URL and CLIENT_URL are set correctly
2. Ensure they match the exact domain (http vs https, www vs non-www)
3. Restart server after changing

## Support & Updates

- GitHub: https://github.com/YOUR_USERNAME/freehold-email
- Issues: Report bugs via GitHub Issues
- Updates: Pull latest changes and redeploy

```bash
# For Git/Render: Auto-deploys on push to main
git pull origin main
git push origin main

# For Docker: Manual redeploy
docker-compose pull
docker-compose up -d --build
```

## Next Steps

1. Set up custom domain (CNAME to Render URL or DNS to your server)
2. Configure email templates in the UI
3. Import your contact list via CSV
4. Create and send your first campaign
5. Monitor delivery in Postmark dashboard
6. Set up analytics and tracking (see README.md for analytics features)
