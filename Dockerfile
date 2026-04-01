FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build frontend
COPY client/ ./client/
RUN cd client && npm install && npm run build

# Copy server
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY shared/ ./shared/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/freehold.db

# Expose port
EXPOSE 3001

# Init DB and start
CMD node scripts/init-db.js && node scripts/seed-db.js && node server/index.js
