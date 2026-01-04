#!/bin/bash

###############################################################################
# ChatSDK INSTANT SETUP
# One command. Zero configuration. Ready to chat in 60 seconds.
#
# Usage:
#   ./instant-setup.sh                    # Default app name
#   ./instant-setup.sh "My Chat App"      # Custom app name
#   ./instant-setup.sh --with-demo        # Include demo data (users, channels, messages)
#   ./instant-setup.sh --reset            # Reset everything
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CREDENTIALS_DIR="$SCRIPT_DIR/credentials"
SECRETS_FILE="$CREDENTIALS_DIR/secrets.json"
WITH_DEMO=false
APP_NAME="ChatSDK Demo"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --with-demo)
            WITH_DEMO=true
            ;;
        --reset)
            # Handled below
            ;;
        *)
            if [[ ! "$arg" == --* ]]; then
                APP_NAME="$arg"
            fi
            ;;
    esac
done

# Check for reset flag
if [[ "$1" == "--reset" ]]; then
    echo -e "${YELLOW}Resetting ChatSDK...${NC}"
    cd "$SCRIPT_DIR/docker"
    docker compose -f docker-compose.instant.yml down -v 2>/dev/null || true
    rm -rf "$CREDENTIALS_DIR"
    rm -f "$SCRIPT_DIR/.env.production"
    rm -f "$SCRIPT_DIR/.instant-setup-complete"
    echo -e "${GREEN}Reset complete. Run ./instant-setup.sh to start fresh.${NC}"
    exit 0
fi

# Skip if already set up
if [[ -f "$SCRIPT_DIR/.instant-setup-complete" ]]; then
    echo -e "${GREEN}ChatSDK is already set up!${NC}"
    echo ""
    echo -e "${BOLD}Your API is running at:${NC} http://localhost:5500"
    echo -e "${BOLD}Demo UI is running at:${NC}  http://localhost:5501"
    echo ""
    echo -e "${DIM}To reset: ./instant-setup.sh --reset${NC}"
    exit 0
fi

# Start
clear
echo -e "${CYAN}"
cat << "EOF"
   _____ _           _   _____ _____  _  __
  / ____| |         | | / ____|  __ \| |/ /
 | |    | |__   __ _| || (___ | |  | | ' /
 | |    | '_ \ / _` | | \___ \| |  | |  <
 | |____| | | | (_| | | ____) | |__| | . \
  \_____|_| |_|\__,_|_||_____/|_____/|_|\_\

        INSTANT SETUP - Zero Config
EOF
echo -e "${NC}"
echo ""

###############################################################################
# Prerequisites Check
###############################################################################

echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check Node.js (optional but helpful)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        echo -e "${YELLOW}Warning: Node.js 18+ recommended (found v$NODE_VERSION)${NC}"
    fi
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

###############################################################################
# Generate All Secrets
###############################################################################

echo -e "${BLUE}Generating secrets...${NC}"

mkdir -p "$CREDENTIALS_DIR"

# Generate all secrets using openssl (works everywhere)
generate_secret() {
    openssl rand -hex "$1"
}

ADMIN_API_KEY=$(generate_secret 32)
JWT_SECRET=$(generate_secret 64)
CENTRIFUGO_SECRET=$(generate_secret 32)
APP_API_KEY=$(generate_secret 32)
APP_SECRET_KEY=$(generate_secret 32)
DB_PASSWORD=$(generate_secret 16)
MINIO_SECRET=$(generate_secret 32)

# Save to single source of truth
APP_ID="app-$(date +%s)-$(openssl rand -hex 4)"
WORKSPACE_ID="ws-$(date +%s)"

cat > "$SECRETS_FILE" << EOF
{
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "app_name": "$APP_NAME",
  "secrets": {
    "ADMIN_API_KEY": "$ADMIN_API_KEY",
    "JWT_SECRET": "$JWT_SECRET",
    "CENTRIFUGO_SECRET": "$CENTRIFUGO_SECRET",
    "DB_PASSWORD": "$DB_PASSWORD",
    "MINIO_SECRET": "$MINIO_SECRET"
  },
  "app": {
    "id": "$APP_ID",
    "api_key": "$APP_API_KEY",
    "secret_key": "$APP_SECRET_KEY"
  },
  "workspace": {
    "id": "$WORKSPACE_ID",
    "name": "General"
  },
  "endpoints": {
    "api": "http://localhost:5500",
    "websocket": "ws://localhost:8001/connection/websocket",
    "demo_ui": "http://localhost:5501",
    "minio_console": "http://localhost:9006"
  }
}
EOF

echo -e "${GREEN}Secrets generated and saved${NC}"
echo ""

###############################################################################
# Create .env.production (from secrets.json)
###############################################################################

echo -e "${BLUE}Creating environment configuration...${NC}"

cat > "$SCRIPT_DIR/.env.production" << EOF
# ChatSDK Instant Setup - Auto-generated $(date)
# DO NOT COMMIT THIS FILE

# Server
NODE_ENV=production
PORT=5500
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:5501,http://localhost:5500,http://localhost:3000,http://localhost:5173

# Database (Docker PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=chatsdk
DB_USER=chatsdk
DB_PASSWORD=$DB_PASSWORD
DB_SSL=false

# Authentication
ADMIN_API_KEY=$ADMIN_API_KEY
JWT_SECRET=$JWT_SECRET

# Centrifugo (WebSocket)
CENTRIFUGO_URL=ws://centrifugo:8000/connection/websocket
CENTRIFUGO_API_URL=http://centrifugo:8000/api
CENTRIFUGO_API_KEY=$CENTRIFUGO_SECRET
CENTRIFUGO_TOKEN_SECRET=$CENTRIFUGO_SECRET

# S3 Storage (MinIO)
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=chatsdk
S3_SECRET_KEY=$MINIO_SECRET
S3_BUCKET=chatsdk
S3_PUBLIC_URL=http://localhost:9004/chatsdk
EOF

echo -e "${GREEN}Environment configured${NC}"
echo ""

###############################################################################
# Update Centrifugo Config
###############################################################################

echo -e "${BLUE}Configuring Centrifugo...${NC}"

cat > "$SCRIPT_DIR/docker/centrifugo.instant.json" << EOF
{
  "token_hmac_secret_key": "$CENTRIFUGO_SECRET",
  "api_key": "$CENTRIFUGO_SECRET",
  "admin": true,
  "admin_password": "admin",
  "admin_secret": "$CENTRIFUGO_SECRET",
  "allowed_origins": [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5500",
    "http://localhost:5501",
    "http://localhost:5502",
    "http://localhost:6001"
  ],
  "log_level": "info",
  "namespaces": [
    {
      "name": "chat",
      "history_size": 100,
      "history_ttl": "24h",
      "join_leave": false
    },
    {
      "name": "presence",
      "presence": true,
      "join_leave": true
    },
    {
      "name": "user"
    }
  ]
}
EOF

echo -e "${GREEN}Centrifugo configured${NC}"
echo ""

###############################################################################
# Create Bootstrap SQL
###############################################################################

echo -e "${BLUE}Creating database bootstrap...${NC}"

cat > "$CREDENTIALS_DIR/bootstrap.sql" << EOF
-- ChatSDK Bootstrap - Auto-generated
-- App: $APP_NAME

-- Insert application
INSERT INTO app (id, name, api_key, api_secret, settings, created_at, updated_at)
VALUES (
  '$APP_ID',
  '$APP_NAME',
  '$APP_API_KEY',
  '$APP_SECRET_KEY',
  '{"ai_enabled": false, "max_file_size": 10485760}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create default workspace
INSERT INTO workspace (id, app_id, name, type, member_count, channel_count, config, created_at, updated_at)
VALUES (
  '$WORKSPACE_ID',
  '$APP_ID',
  'General',
  'team',
  0,
  0,
  '{}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
EOF

echo -e "${GREEN}Bootstrap SQL created${NC}"
echo ""

###############################################################################
# Start Docker Services
###############################################################################

echo -e "${BLUE}Starting services (this may take 1-2 minutes on first run)...${NC}"
echo ""

cd "$SCRIPT_DIR/docker"

# Export secrets for docker-compose
export DB_PASSWORD="$DB_PASSWORD"
export MINIO_SECRET="$MINIO_SECRET"
export CENTRIFUGO_SECRET="$CENTRIFUGO_SECRET"
export JWT_SECRET="$JWT_SECRET"
export ADMIN_API_KEY="$ADMIN_API_KEY"
export APP_API_KEY="$APP_API_KEY"

# Start all services
docker compose -f docker-compose.instant.yml up -d --build

cd "$SCRIPT_DIR"

echo ""
echo -e "${YELLOW}Waiting for services to be ready...${NC}"

# Wait for PostgreSQL
echo -n "  PostgreSQL: "
for i in {1..30}; do
    if docker exec chatsdk-postgres pg_isready -U chatsdk &> /dev/null; then
        echo -e "${GREEN}ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for MinIO
echo -n "  MinIO:      "
for i in {1..20}; do
    if curl -s http://localhost:9004/minio/health/live &> /dev/null; then
        echo -e "${GREEN}ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Centrifugo
echo -n "  Centrifugo: "
for i in {1..20}; do
    if curl -s http://localhost:8001/health &> /dev/null; then
        echo -e "${GREEN}ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for API
echo -n "  API:        "
for i in {1..30}; do
    if curl -s http://localhost:5500/health &> /dev/null; then
        echo -e "${GREEN}ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""

###############################################################################
# Run Migrations & Bootstrap
###############################################################################

echo -e "${BLUE}Initializing database...${NC}"

# Run migrations
docker exec chatsdk-api npm run migrate 2>/dev/null || true

# Apply bootstrap SQL
docker exec -i chatsdk-postgres psql -U chatsdk -d chatsdk < "$CREDENTIALS_DIR/bootstrap.sql" 2>/dev/null || true

# Create MinIO bucket
docker exec chatsdk-minio mc alias set local http://localhost:9000 chatsdk "$MINIO_SECRET" 2>/dev/null || true
docker exec chatsdk-minio mc mb local/chatsdk --ignore-existing 2>/dev/null || true
docker exec chatsdk-minio mc anonymous set download local/chatsdk 2>/dev/null || true

echo -e "${GREEN}Database initialized${NC}"
echo ""

###############################################################################
# Create Quick-Start Credentials File
###############################################################################

cat > "$CREDENTIALS_DIR/QUICKSTART.md" << EOF
# ChatSDK Quick Start Credentials

## Your API Key
\`\`\`
$APP_API_KEY
\`\`\`

## Test Token Creation
\`\`\`bash
curl -X POST http://localhost:5500/tokens \\
  -H "X-API-Key: $APP_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"userId": "user-1", "name": "Test User"}'
\`\`\`

## Endpoints
- API: http://localhost:5500
- Demo UI: http://localhost:5501
- WebSocket: ws://localhost:8001/connection/websocket
- MinIO Console: http://localhost:9006 (user: chatsdk, pass: $MINIO_SECRET)

## React Integration
\`\`\`tsx
import { ChatProvider } from '@chatsdk/react';

function App() {
  return (
    <ChatProvider
      apiUrl="http://localhost:5500"
      token={yourToken}  // From /tokens endpoint
    >
      <YourChatComponent />
    </ChatProvider>
  );
}
\`\`\`

## Full Credentials
See: credentials/secrets.json
EOF

###############################################################################
# Mark Setup Complete
###############################################################################

touch "$SCRIPT_DIR/.instant-setup-complete"

###############################################################################
# Seed Demo Data (if --with-demo flag was used)
###############################################################################

if [[ "$WITH_DEMO" == "true" ]]; then
    echo -e "${BLUE}Seeding demo data (users, workspaces, channels, messages)...${NC}"
    echo ""

    # Check if Node.js is available
    if command -v node &> /dev/null; then
        node "$SCRIPT_DIR/scripts/seed-demo-data.mjs" 2>/dev/null || {
            echo -e "${YELLOW}Could not seed demo data. You can run it manually:${NC}"
            echo -e "${DIM}  node scripts/seed-demo-data.mjs${NC}"
        }
    else
        echo -e "${YELLOW}Node.js not found. To seed demo data, run:${NC}"
        echo -e "${DIM}  node scripts/seed-demo-data.mjs${NC}"
    fi
    echo ""
fi

###############################################################################
# Final Output
###############################################################################

clear
echo -e "${GREEN}"
cat << "EOF"
   _____ _           _   _____ _____  _  __
  / ____| |         | | / ____|  __ \| |/ /
 | |    | |__   __ _| || (___ | |  | | ' /
 | |    | '_ \ / _` | | \___ \| |  | |  <
 | |____| | | | (_| | | ____) | |__| | . \
  \_____|_| |_|\__,_|_||_____/|_____/|_|\_\

         SETUP COMPLETE!
EOF
echo -e "${NC}"
echo ""
echo -e "${BOLD}Your ChatSDK is ready to use!${NC}"
echo ""
echo -e "${CYAN}Endpoints:${NC}"
echo -e "  API Server:    ${GREEN}http://localhost:5500${NC}"
echo -e "  Demo UI:       ${GREEN}http://localhost:5501${NC}"
echo -e "  WebSocket:     ${GREEN}ws://localhost:8001/connection/websocket${NC}"
echo -e "  MinIO Console: ${GREEN}http://localhost:9006${NC}"
echo ""
echo -e "${CYAN}Your API Key:${NC}"
echo -e "  ${YELLOW}$APP_API_KEY${NC}"
echo ""
echo -e "${CYAN}Quick Test:${NC}"
echo -e "  ${DIM}curl -X POST http://localhost:5500/tokens \\${NC}"
echo -e "  ${DIM}  -H \"X-API-Key: $APP_API_KEY\" \\${NC}"
echo -e "  ${DIM}  -H \"Content-Type: application/json\" \\${NC}"
echo -e "  ${DIM}  -d '{\"userId\": \"user-1\", \"name\": \"Test User\"}'${NC}"
echo ""
echo -e "${CYAN}Files Created:${NC}"
echo -e "  credentials/secrets.json    ${DIM}# All secrets (single source of truth)${NC}"
echo -e "  credentials/QUICKSTART.md   ${DIM}# Integration guide${NC}"
echo -e "  .env.production             ${DIM}# Environment config${NC}"
echo ""
echo -e "${CYAN}Commands:${NC}"
echo -e "  ${DIM}node scripts/seed-demo-data.mjs${NC}     # Add demo users, workspaces, channels"
echo -e "  ${DIM}node scripts/test-api-routes.mjs${NC}    # Test all API endpoints"
echo -e "  ${DIM}./create-chat-app.sh my-app${NC}         # Create your own chat app"
echo -e "  ${DIM}./instant-setup.sh --reset${NC}          # Reset everything"
echo ""
echo -e "${CYAN}Docker:${NC}"
echo -e "  ${DIM}docker compose -f docker/docker-compose.instant.yml logs -f api${NC}    # View logs"
echo -e "  ${DIM}docker compose -f docker/docker-compose.instant.yml down${NC}           # Stop services"
echo ""

if [[ "$WITH_DEMO" == "true" ]]; then
    echo -e "${GREEN}Demo data was seeded! Check credentials/demo-users.json for test accounts.${NC}"
    echo ""
fi

echo -e "${GREEN}Happy chatting!${NC}"
echo ""
