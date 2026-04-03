# ─────────────────────────────────────────────
# Freehold Email — Self-Hosted Docker Image
# One-time purchase. Your server. Your data.
# ─────────────────────────────────────────────

FROM node:18-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY client/ ./client/
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY shared/ ./shared/

# Build the frontend
RUN npx vite build client

# ─────────────────────────────────────────────
# Production stage — smaller final image
# ─────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built client and server from builder
COPY --from=builder /app/client/dist ./client/dist
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY shared/ ./shared/

# Create persistent data directory
RUN mkdir -p /app/data

# Non-root user for security
RUN addgroup -S freehold && adduser -S freehold -G freehold
RUN chown -R freehold:freehold /app
USER freehold

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/freehold.db

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Initialize database (idempotent) and start server
CMD ["sh", "-c", "node scripts/init-db.js && node scripts/seed-db.js && node server/index.js"]
