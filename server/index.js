import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

import { db } from './db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import contactsRouter from './routes/contacts.js';
import listsRouter from './routes/lists.js';
import templatesRouter from './routes/templates.js';
import campaignsRouter from './routes/campaigns.js';
import webhooksRouter from './routes/webhooks.js';
import analyticsRouter from './routes/analytics.js';
import unsubscribeRouter from './routes/unsubscribe.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:5173';

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

// Request logging in development
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected routes (require authentication)
app.use('/api/contacts', requireAuth, contactsRouter);
app.use('/api/lists', requireAuth, listsRouter);
app.use('/api/templates', requireAuth, templatesRouter);
app.use('/api/campaigns', requireAuth, campaignsRouter);

// Webhook routes (public, called by Postmark)
app.use('/api/webhooks', webhooksRouter);

// Analytics routes (protected)
app.use('/api/analytics', requireAuth, analyticsRouter);

// Unsubscribe handler (public route, not under /api)
app.use('/', unsubscribeRouter);

// Serve static assets from client build (if exists)
const distPath = path.join(__dirname, '../client/dist');
try {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} catch (error) {
  // Client not built yet, that's fine for development
}

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Database checks
const checkDatabase = () => {
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
    console.log(`✓ Database connected (${result.count} contacts)`);
    return true;
  } catch (error) {
    console.error('✗ Database error:', error.message);
    console.log('Run: npm run db:init && npm run db:seed');
    return false;
  }
};

// Start server
const start = () => {
  if (!checkDatabase()) {
    console.error('Cannot start server without database. Exiting.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║  Freehold Email Server                     ║
║  Port: ${PORT.toString().padEnd(32)}║
║  Environment: ${NODE_ENV.padEnd(26)}║
║  Client URL: ${CLIENT_URL.padEnd(25)}║
╚════════════════════════════════════════════╝
    `);
  });
};

start();

export default app;
