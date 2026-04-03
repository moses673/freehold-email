#!/bin/bash
# ─────────────────────────────────────────────
# Freehold Email — Self-Hosted Setup Script
# Run this once after cloning the repository.
# ─────────────────────────────────────────────

set -e

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  Freehold Email — Setup                    ║"
echo "║  One-time purchase. Your server. Your data.║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed."
    echo "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed."
    echo "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker found"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from template..."
    cp .env.example .env

    # Generate secrets automatically
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64)
    UNSUB_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64)

    # Replace placeholder secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/CHANGE_ME_generate_with_openssl_rand_hex_32/$JWT_SECRET/" .env
        sed -i '' "0,/CHANGE_ME_generate_with_openssl_rand_hex_32/s/CHANGE_ME_generate_with_openssl_rand_hex_32/$UNSUB_SECRET/" .env
    else
        sed -i "s/CHANGE_ME_generate_with_openssl_rand_hex_32/$JWT_SECRET/" .env
        sed -i "0,/CHANGE_ME_generate_with_openssl_rand_hex_32/s/CHANGE_ME_generate_with_openssl_rand_hex_32/$UNSUB_SECRET/" .env
    fi

    echo "✓ .env created with auto-generated secrets"
    echo ""
    echo "┌──────────────────────────────────────────┐"
    echo "│  ACTION REQUIRED: Edit .env now           │"
    echo "│                                            │"
    echo "│  Set these values before starting:         │"
    echo "│    • POSTMARK_API_KEY                      │"
    echo "│    • POSTMARK_FROM_EMAIL                   │"
    echo "│    • APP_URL                               │"
    echo "│                                            │"
    echo "│  Then run: docker compose up -d            │"
    echo "└──────────────────────────────────────────┘"
    echo ""
    echo "Get a Postmark API key at: https://postmarkapp.com"
    echo ""
else
    echo "✓ .env already exists"
    echo ""

    # Check if required values are set
    MISSING=""
    if grep -q "your-postmark-server-api-token" .env 2>/dev/null; then
        MISSING="$MISSING POSTMARK_API_KEY"
    fi
    if grep -q "you@yourdomain.com" .env 2>/dev/null; then
        MISSING="$MISSING POSTMARK_FROM_EMAIL"
    fi
    if grep -q "yourdomain.com" .env 2>/dev/null; then
        MISSING="$MISSING APP_URL"
    fi

    if [ -n "$MISSING" ]; then
        echo "WARNING: These .env values still need to be set:$MISSING"
        echo "Edit .env before running docker compose up -d"
        echo ""
        exit 1
    fi

    echo "✓ .env looks configured"
    echo ""
    echo "Starting Freehold Email..."
    echo ""

    # Build and start
    docker compose up -d --build

    echo ""
    echo "✓ Freehold Email is starting up..."
    echo ""
    echo "  App:    http://localhost:${PORT:-3001}"
    echo "  Health: http://localhost:${PORT:-3001}/health"
    echo ""
    echo "  View logs:  docker compose logs -f"
    echo "  Stop:       docker compose down"
    echo "  Restart:    docker compose restart"
    echo ""
    echo "  Your data is stored in Docker volume: freehold-email-data"
    echo "  Back it up:  docker run --rm -v freehold-email-data:/data -v \$(pwd):/backup alpine tar czf /backup/freehold-backup.tar.gz /data"
    echo ""
fi
