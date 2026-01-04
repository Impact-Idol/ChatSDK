#!/bin/bash

###############################################################################
# ChatSDK Interactive Setup
# Flexible setup with options for ports, CORS, UI framework, and more
#
# Usage:
#   ./setup.sh                    # Interactive mode (recommended)
#   ./setup.sh --config file.json # Use config file
#   ./setup.sh --api-only         # API server only, no UI
#   ./setup.sh --headless         # Just generate config, no Docker
#   ./setup.sh --reset            # Reset everything
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/chatsdk.config.json"
CREDENTIALS_DIR="$SCRIPT_DIR/credentials"

# Default configuration
declare -A CONFIG
CONFIG[app_name]="My Chat App"
CONFIG[api_port]=5500
CONFIG[ws_port]=8001
CONFIG[ui_port]=5501
CONFIG[db_port]=5434
CONFIG[minio_port]=9004
CONFIG[cors_origins]="http://localhost:3000,http://localhost:5173,http://localhost:5501"
CONFIG[ui_framework]="none"  # none, vite, nextjs, components-only
CONFIG[include_demo_data]=false
CONFIG[include_postgres]=true
CONFIG[include_minio]=true
CONFIG[include_ui]=false

# Parse arguments
API_ONLY=false
HEADLESS=false
USE_CONFIG_FILE=""
INTERACTIVE=true

for arg in "$@"; do
    case $arg in
        --api-only)
            API_ONLY=true
            CONFIG[include_ui]=false
            INTERACTIVE=false
            ;;
        --headless)
            HEADLESS=true
            INTERACTIVE=false
            ;;
        --config=*)
            USE_CONFIG_FILE="${arg#*=}"
            INTERACTIVE=false
            ;;
        --reset)
            echo -e "${YELLOW}Resetting ChatSDK...${NC}"
            cd "$SCRIPT_DIR/docker" 2>/dev/null || true
            docker compose -f docker-compose.custom.yml down -v 2>/dev/null || true
            docker compose -f docker-compose.instant.yml down -v 2>/dev/null || true
            rm -rf "$CREDENTIALS_DIR"
            rm -f "$SCRIPT_DIR/.env.production"
            rm -f "$SCRIPT_DIR/.setup-complete"
            rm -f "$SCRIPT_DIR/chatsdk.config.json"
            rm -f "$SCRIPT_DIR/docker/docker-compose.custom.yml"
            echo -e "${GREEN}Reset complete.${NC}"
            exit 0
            ;;
        --help|-h)
            echo "ChatSDK Setup"
            echo ""
            echo "Usage: ./setup.sh [options]"
            echo ""
            echo "Options:"
            echo "  (no args)         Interactive setup wizard"
            echo "  --api-only        API server only (no UI)"
            echo "  --headless        Generate config only (no Docker)"
            echo "  --config=FILE     Use existing config file"
            echo "  --reset           Remove all setup files"
            echo ""
            echo "Examples:"
            echo "  ./setup.sh                     # Interactive wizard"
            echo "  ./setup.sh --api-only          # Just the API"
            echo "  ./setup.sh --config=my.json    # Use saved config"
            exit 0
            ;;
    esac
done

# ============================================================================
# Helper Functions
# ============================================================================

prompt() {
    local var_name="$1"
    local prompt_text="$2"
    local default_value="$3"

    echo -ne "${CYAN}$prompt_text${NC}"
    if [[ -n "$default_value" ]]; then
        echo -ne " ${DIM}[$default_value]${NC}"
    fi
    echo -ne ": "

    read -r input
    if [[ -z "$input" ]]; then
        input="$default_value"
    fi
    CONFIG[$var_name]="$input"
}

prompt_choice() {
    local var_name="$1"
    local prompt_text="$2"
    shift 2
    local options=("$@")

    echo -e "${CYAN}$prompt_text${NC}"
    local i=1
    for opt in "${options[@]}"; do
        echo -e "  ${YELLOW}$i)${NC} $opt"
        ((i++))
    done
    echo -ne "${CYAN}Enter choice [1]: ${NC}"

    read -r choice
    choice=${choice:-1}

    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
        CONFIG[$var_name]="${options[$((choice-1))]}"
    else
        CONFIG[$var_name]="${options[0]}"
    fi
}

prompt_yesno() {
    local var_name="$1"
    local prompt_text="$2"
    local default="$3"

    local hint="y/n"
    [[ "$default" == "true" ]] && hint="Y/n"
    [[ "$default" == "false" ]] && hint="y/N"

    echo -ne "${CYAN}$prompt_text${NC} ${DIM}[$hint]${NC}: "
    read -r answer

    if [[ -z "$answer" ]]; then
        CONFIG[$var_name]="$default"
    elif [[ "$answer" =~ ^[Yy] ]]; then
        CONFIG[$var_name]="true"
    else
        CONFIG[$var_name]="false"
    fi
}

generate_secret() {
    openssl rand -hex "$1"
}

# ============================================================================
# Load Config File (if provided)
# ============================================================================

if [[ -n "$USE_CONFIG_FILE" ]] && [[ -f "$USE_CONFIG_FILE" ]]; then
    echo -e "${BLUE}Loading config from $USE_CONFIG_FILE...${NC}"

    # Parse JSON config (basic parsing with grep/sed)
    while IFS= read -r line; do
        key=$(echo "$line" | grep -o '"[^"]*":' | tr -d '":')
        value=$(echo "$line" | grep -o ': *"[^"]*"' | sed 's/: *"\(.*\)"/\1/')
        if [[ -n "$key" ]] && [[ -n "$value" ]]; then
            CONFIG[$key]="$value"
        fi
    done < "$USE_CONFIG_FILE"
fi

# ============================================================================
# Interactive Setup Wizard
# ============================================================================

if [[ "$INTERACTIVE" == "true" ]]; then
    clear
    echo -e "${CYAN}"
    cat << "EOF"
   _____ _           _   _____ _____  _  __
  / ____| |         | | / ____|  __ \| |/ /
 | |    | |__   __ _| || (___ | |  | | ' /
 | |    | '_ \ / _` | | \___ \| |  | |  <
 | |____| | | | (_| | | ____) | |__| | . \
  \_____|_| |_|\__,_|_||_____/|_____/|_|\_\

        INTERACTIVE SETUP WIZARD
EOF
    echo -e "${NC}"
    echo ""
    echo -e "${BOLD}Answer a few questions to configure ChatSDK for your needs.${NC}"
    echo -e "${DIM}Press Enter to accept defaults.${NC}"
    echo ""

    # -------------------------------------------------------------------------
    # Basic Configuration
    # -------------------------------------------------------------------------
    echo -e "${MAGENTA}━━━ Basic Configuration ━━━${NC}"
    echo ""

    prompt "app_name" "Application name" "My Chat App"
    echo ""

    # -------------------------------------------------------------------------
    # Deployment Mode
    # -------------------------------------------------------------------------
    echo -e "${MAGENTA}━━━ Deployment Mode ━━━${NC}"
    echo ""

    echo -e "${CYAN}What do you need?${NC}"
    echo -e "  ${YELLOW}1)${NC} Full stack (API + UI + Database) ${DIM}← Most common${NC}"
    echo -e "  ${YELLOW}2)${NC} API only (no UI, bring your own frontend)"
    echo -e "  ${YELLOW}3)${NC} Headless (just generate config, no Docker)"
    echo -ne "${CYAN}Enter choice [1]: ${NC}"

    read -r mode_choice
    mode_choice=${mode_choice:-1}

    case $mode_choice in
        2)
            CONFIG[include_ui]=false
            ;;
        3)
            HEADLESS=true
            CONFIG[include_ui]=false
            ;;
        *)
            CONFIG[include_ui]=true
            ;;
    esac
    echo ""

    # -------------------------------------------------------------------------
    # UI Framework (if UI included)
    # -------------------------------------------------------------------------
    if [[ "${CONFIG[include_ui]}" == "true" ]]; then
        echo -e "${MAGENTA}━━━ UI Framework ━━━${NC}"
        echo ""

        echo -e "${CYAN}Which UI setup do you prefer?${NC}"
        echo -e "  ${YELLOW}1)${NC} Complete Vite app (react-chat-huly template) ${DIM}← Ready to customize${NC}"
        echo -e "  ${YELLOW}2)${NC} Next.js starter ${DIM}← For Next.js projects${NC}"
        echo -e "  ${YELLOW}3)${NC} Components only (@chatsdk/react) ${DIM}← Add to existing app${NC}"
        echo -ne "${CYAN}Enter choice [1]: ${NC}"

        read -r ui_choice
        ui_choice=${ui_choice:-1}

        case $ui_choice in
            2) CONFIG[ui_framework]="nextjs" ;;
            3) CONFIG[ui_framework]="components-only" ;;
            *) CONFIG[ui_framework]="vite" ;;
        esac
        echo ""
    fi

    # -------------------------------------------------------------------------
    # Ports Configuration
    # -------------------------------------------------------------------------
    echo -e "${MAGENTA}━━━ Ports Configuration ━━━${NC}"
    echo ""

    prompt_yesno "use_default_ports" "Use default ports? (API:5500, WS:8001, UI:5501)" "true"

    if [[ "${CONFIG[use_default_ports]}" != "true" ]]; then
        echo ""
        prompt "api_port" "API server port" "5500"
        prompt "ws_port" "WebSocket port" "8001"
        if [[ "${CONFIG[include_ui]}" == "true" ]]; then
            prompt "ui_port" "UI port" "5501"
        fi
        prompt "db_port" "PostgreSQL port" "5434"
        prompt "minio_port" "MinIO port" "9004"
    fi
    echo ""

    # -------------------------------------------------------------------------
    # CORS Configuration
    # -------------------------------------------------------------------------
    echo -e "${MAGENTA}━━━ CORS Configuration ━━━${NC}"
    echo ""

    echo -e "${CYAN}Where will your frontend run?${NC}"
    echo -e "  ${YELLOW}1)${NC} localhost (development) ${DIM}← Auto-configures common ports${NC}"
    echo -e "  ${YELLOW}2)${NC} Custom domain(s)"
    echo -ne "${CYAN}Enter choice [1]: ${NC}"

    read -r cors_choice
    cors_choice=${cors_choice:-1}

    if [[ "$cors_choice" == "2" ]]; then
        echo ""
        echo -e "${DIM}Enter comma-separated origins (e.g., https://myapp.com,https://admin.myapp.com)${NC}"
        prompt "cors_origins" "Allowed origins" "https://myapp.com"
    else
        # Auto-configure for localhost development
        CONFIG[cors_origins]="http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174,http://localhost:5500,http://localhost:${CONFIG[ui_port]}"
    fi
    echo ""

    # -------------------------------------------------------------------------
    # Database Configuration
    # -------------------------------------------------------------------------
    echo -e "${MAGENTA}━━━ Database Configuration ━━━${NC}"
    echo ""

    prompt_yesno "include_postgres" "Include PostgreSQL in Docker? (No = use external DB)" "true"

    if [[ "${CONFIG[include_postgres]}" != "true" ]]; then
        echo ""
        prompt "db_host" "Database host" "localhost"
        prompt "db_name" "Database name" "chatsdk"
        prompt "db_user" "Database user" "chatsdk"
        prompt "db_password" "Database password" ""
    fi
    echo ""

    # -------------------------------------------------------------------------
    # Storage Configuration
    # -------------------------------------------------------------------------
    echo -e "${MAGENTA}━━━ File Storage Configuration ━━━${NC}"
    echo ""

    prompt_yesno "include_minio" "Include MinIO (S3) in Docker? (No = use external S3)" "true"

    if [[ "${CONFIG[include_minio]}" != "true" ]]; then
        echo ""
        prompt "s3_endpoint" "S3 endpoint" "https://s3.amazonaws.com"
        prompt "s3_bucket" "S3 bucket name" "chatsdk-uploads"
        prompt "s3_access_key" "S3 access key" ""
        prompt "s3_secret_key" "S3 secret key" ""
    fi
    echo ""

    # -------------------------------------------------------------------------
    # Demo Data
    # -------------------------------------------------------------------------
    echo -e "${MAGENTA}━━━ Demo Data ━━━${NC}"
    echo ""

    prompt_yesno "include_demo_data" "Seed demo data? (users, workspaces, channels, messages)" "false"
    echo ""

    # -------------------------------------------------------------------------
    # Confirmation
    # -------------------------------------------------------------------------
    echo -e "${MAGENTA}━━━ Configuration Summary ━━━${NC}"
    echo ""
    echo -e "  App Name:     ${GREEN}${CONFIG[app_name]}${NC}"
    echo -e "  API Port:     ${GREEN}${CONFIG[api_port]}${NC}"
    echo -e "  WebSocket:    ${GREEN}${CONFIG[ws_port]}${NC}"
    [[ "${CONFIG[include_ui]}" == "true" ]] && echo -e "  UI Port:      ${GREEN}${CONFIG[ui_port]}${NC}"
    [[ "${CONFIG[include_ui]}" == "true" ]] && echo -e "  UI Framework: ${GREEN}${CONFIG[ui_framework]}${NC}"
    echo -e "  PostgreSQL:   ${GREEN}$([[ "${CONFIG[include_postgres]}" == "true" ]] && echo "Docker" || echo "External")${NC}"
    echo -e "  S3 Storage:   ${GREEN}$([[ "${CONFIG[include_minio]}" == "true" ]] && echo "MinIO (Docker)" || echo "External")${NC}"
    echo -e "  CORS:         ${GREEN}${CONFIG[cors_origins]:0:50}...${NC}"
    echo -e "  Demo Data:    ${GREEN}${CONFIG[include_demo_data]}${NC}"
    echo ""

    prompt_yesno "confirm" "Proceed with this configuration?" "true"

    if [[ "${CONFIG[confirm]}" != "true" ]]; then
        echo -e "${YELLOW}Setup cancelled.${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}Setting up ChatSDK...${NC}"
echo ""

# ============================================================================
# Generate Secrets
# ============================================================================

echo -e "${BLUE}Generating secrets...${NC}"

mkdir -p "$CREDENTIALS_DIR"

ADMIN_API_KEY=$(generate_secret 32)
JWT_SECRET=$(generate_secret 64)
CENTRIFUGO_SECRET=$(generate_secret 32)
APP_API_KEY=$(generate_secret 32)
APP_SECRET_KEY=$(generate_secret 32)
DB_PASSWORD=$(generate_secret 16)
MINIO_SECRET=$(generate_secret 32)

APP_ID="app-$(date +%s)-$(openssl rand -hex 4)"
WORKSPACE_ID="ws-$(date +%s)"

# ============================================================================
# Save Configuration
# ============================================================================

echo -e "${BLUE}Saving configuration...${NC}"

cat > "$CONFIG_FILE" << EOF
{
  "app_name": "${CONFIG[app_name]}",
  "ports": {
    "api": ${CONFIG[api_port]},
    "websocket": ${CONFIG[ws_port]},
    "ui": ${CONFIG[ui_port]},
    "database": ${CONFIG[db_port]},
    "minio": ${CONFIG[minio_port]}
  },
  "cors_origins": "${CONFIG[cors_origins]}",
  "ui_framework": "${CONFIG[ui_framework]}",
  "include_postgres": ${CONFIG[include_postgres]},
  "include_minio": ${CONFIG[include_minio]},
  "include_ui": ${CONFIG[include_ui]},
  "include_demo_data": ${CONFIG[include_demo_data]}
}
EOF

# Save secrets
cat > "$CREDENTIALS_DIR/secrets.json" << EOF
{
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "app_name": "${CONFIG[app_name]}",
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
  "endpoints": {
    "api": "http://localhost:${CONFIG[api_port]}",
    "websocket": "ws://localhost:${CONFIG[ws_port]}/connection/websocket"
  }
}
EOF

# ============================================================================
# Generate .env.production
# ============================================================================

echo -e "${BLUE}Creating environment configuration...${NC}"

cat > "$SCRIPT_DIR/.env.production" << EOF
# ChatSDK Configuration - Generated $(date)
# App: ${CONFIG[app_name]}

NODE_ENV=production
PORT=${CONFIG[api_port]}
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=${CONFIG[cors_origins]}

# Database
EOF

if [[ "${CONFIG[include_postgres]}" == "true" ]]; then
    cat >> "$SCRIPT_DIR/.env.production" << EOF
DB_HOST=postgres
DB_PORT=5432
DB_NAME=chatsdk
DB_USER=chatsdk
DB_PASSWORD=$DB_PASSWORD
DB_SSL=false
EOF
else
    cat >> "$SCRIPT_DIR/.env.production" << EOF
DB_HOST=${CONFIG[db_host]:-localhost}
DB_PORT=5432
DB_NAME=${CONFIG[db_name]:-chatsdk}
DB_USER=${CONFIG[db_user]:-chatsdk}
DB_PASSWORD=${CONFIG[db_password]}
DB_SSL=true
EOF
fi

cat >> "$SCRIPT_DIR/.env.production" << EOF

# Authentication
ADMIN_API_KEY=$ADMIN_API_KEY
JWT_SECRET=$JWT_SECRET

# Centrifugo
CENTRIFUGO_URL=ws://centrifugo:8000/connection/websocket
CENTRIFUGO_API_URL=http://centrifugo:8000/api
CENTRIFUGO_API_KEY=$CENTRIFUGO_SECRET
CENTRIFUGO_TOKEN_SECRET=$CENTRIFUGO_SECRET

# S3 Storage
EOF

if [[ "${CONFIG[include_minio]}" == "true" ]]; then
    cat >> "$SCRIPT_DIR/.env.production" << EOF
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=chatsdk
S3_SECRET_KEY=$MINIO_SECRET
S3_BUCKET=chatsdk
S3_PUBLIC_URL=http://localhost:${CONFIG[minio_port]}/chatsdk
EOF
else
    cat >> "$SCRIPT_DIR/.env.production" << EOF
S3_ENDPOINT=${CONFIG[s3_endpoint]}
S3_REGION=us-east-1
S3_ACCESS_KEY=${CONFIG[s3_access_key]}
S3_SECRET_KEY=${CONFIG[s3_secret_key]}
S3_BUCKET=${CONFIG[s3_bucket]}
EOF
fi

# ============================================================================
# Generate Custom Docker Compose
# ============================================================================

if [[ "$HEADLESS" != "true" ]]; then
    echo -e "${BLUE}Generating Docker configuration...${NC}"

    cat > "$SCRIPT_DIR/docker/docker-compose.custom.yml" << EOF
# ChatSDK Custom Docker Compose
# Generated for: ${CONFIG[app_name]}
# Ports: API=${CONFIG[api_port]}, WS=${CONFIG[ws_port]}, UI=${CONFIG[ui_port]}

version: '3.8'

services:
EOF

    # PostgreSQL (if included)
    if [[ "${CONFIG[include_postgres]}" == "true" ]]; then
        cat >> "$SCRIPT_DIR/docker/docker-compose.custom.yml" << EOF
  postgres:
    image: postgres:16-alpine
    container_name: chatsdk-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: chatsdk
      POSTGRES_PASSWORD: $DB_PASSWORD
      POSTGRES_DB: chatsdk
    ports:
      - "${CONFIG[db_port]}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../packages/api/src/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chatsdk"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - chatsdk

EOF
    fi

    # MinIO (if included)
    if [[ "${CONFIG[include_minio]}" == "true" ]]; then
        cat >> "$SCRIPT_DIR/docker/docker-compose.custom.yml" << EOF
  minio:
    image: minio/minio:latest
    container_name: chatsdk-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: chatsdk
      MINIO_ROOT_PASSWORD: $MINIO_SECRET
    ports:
      - "${CONFIG[minio_port]}:9000"
      - "$((CONFIG[minio_port] + 2)):9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - chatsdk

  minio-setup:
    image: minio/mc:latest
    container_name: chatsdk-minio-setup
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 chatsdk $MINIO_SECRET;
      mc mb local/chatsdk --ignore-existing;
      mc anonymous set download local/chatsdk;
      exit 0;
      "
    networks:
      - chatsdk

EOF
    fi

    # Centrifugo
    cat >> "$SCRIPT_DIR/docker/docker-compose.custom.yml" << EOF
  centrifugo:
    image: centrifugo/centrifugo:v5
    container_name: chatsdk-centrifugo
    restart: unless-stopped
    command: centrifugo --config=/centrifugo/config.json
    volumes:
      - ./centrifugo.custom.json:/centrifugo/config.json:ro
    ports:
      - "${CONFIG[ws_port]}:8000"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8000/health"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - chatsdk

EOF

    # API Server
    cat >> "$SCRIPT_DIR/docker/docker-compose.custom.yml" << EOF
  api:
    build:
      context: ../
      dockerfile: docker/Dockerfile.api
    container_name: chatsdk-api
    restart: unless-stopped
    depends_on:
EOF

    [[ "${CONFIG[include_postgres]}" == "true" ]] && echo "      postgres:" >> "$SCRIPT_DIR/docker/docker-compose.custom.yml"
    [[ "${CONFIG[include_postgres]}" == "true" ]] && echo "        condition: service_healthy" >> "$SCRIPT_DIR/docker/docker-compose.custom.yml"
    echo "      centrifugo:" >> "$SCRIPT_DIR/docker/docker-compose.custom.yml"
    echo "        condition: service_healthy" >> "$SCRIPT_DIR/docker/docker-compose.custom.yml"

    if [[ "${CONFIG[include_minio]}" == "true" ]]; then
        cat >> "$SCRIPT_DIR/docker/docker-compose.custom.yml" << EOF
      minio-setup:
        condition: service_completed_successfully
EOF
    fi

    cat >> "$SCRIPT_DIR/docker/docker-compose.custom.yml" << EOF
    env_file:
      - ../.env.production
    ports:
      - "${CONFIG[api_port]}:5500"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5500/health"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    networks:
      - chatsdk

EOF

    # Volumes and Networks
    cat >> "$SCRIPT_DIR/docker/docker-compose.custom.yml" << EOF
volumes:
EOF
    [[ "${CONFIG[include_postgres]}" == "true" ]] && echo "  postgres_data:" >> "$SCRIPT_DIR/docker/docker-compose.custom.yml"
    [[ "${CONFIG[include_minio]}" == "true" ]] && echo "  minio_data:" >> "$SCRIPT_DIR/docker/docker-compose.custom.yml"

    cat >> "$SCRIPT_DIR/docker/docker-compose.custom.yml" << EOF

networks:
  chatsdk:
    name: chatsdk-network
    driver: bridge
EOF

    # Generate Centrifugo config
    cat > "$SCRIPT_DIR/docker/centrifugo.custom.json" << EOF
{
  "token_hmac_secret_key": "$CENTRIFUGO_SECRET",
  "api_key": "$CENTRIFUGO_SECRET",
  "admin": true,
  "admin_password": "admin",
  "admin_secret": "$CENTRIFUGO_SECRET",
  "allowed_origins": [$(echo "${CONFIG[cors_origins]}" | sed 's/,/","/g' | sed 's/^/"/;s/$/"/')],
  "log_level": "info",
  "namespaces": [
    {"name": "chat", "history_size": 100, "history_ttl": "24h"},
    {"name": "presence", "presence": true, "join_leave": true},
    {"name": "user"}
  ]
}
EOF

fi

# ============================================================================
# Generate Bootstrap SQL
# ============================================================================

cat > "$CREDENTIALS_DIR/bootstrap.sql" << EOF
-- ChatSDK Bootstrap - ${CONFIG[app_name]}
INSERT INTO app (id, name, api_key, api_secret, settings, created_at, updated_at)
VALUES ('$APP_ID', '${CONFIG[app_name]}', '$APP_API_KEY', '$APP_SECRET_KEY', '{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspace (id, app_id, name, type, member_count, channel_count, config, created_at, updated_at)
VALUES ('$WORKSPACE_ID', '$APP_ID', 'General', 'team', 0, 0, '{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOF

# ============================================================================
# Start Services (if not headless)
# ============================================================================

if [[ "$HEADLESS" != "true" ]]; then
    echo -e "${BLUE}Starting services...${NC}"

    cd "$SCRIPT_DIR/docker"
    docker compose -f docker-compose.custom.yml up -d --build

    cd "$SCRIPT_DIR"

    echo ""
    echo -e "${YELLOW}Waiting for services...${NC}"

    # Wait for services
    if [[ "${CONFIG[include_postgres]}" == "true" ]]; then
        echo -n "  PostgreSQL: "
        for i in {1..30}; do
            if docker exec chatsdk-postgres pg_isready -U chatsdk &> /dev/null; then
                echo -e "${GREEN}ready${NC}"
                break
            fi
            echo -n "."
            sleep 1
        done
    fi

    echo -n "  Centrifugo: "
    for i in {1..20}; do
        if curl -s "http://localhost:${CONFIG[ws_port]}/health" &> /dev/null; then
            echo -e "${GREEN}ready${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done

    echo -n "  API:        "
    for i in {1..30}; do
        if curl -s "http://localhost:${CONFIG[api_port]}/health" &> /dev/null; then
            echo -e "${GREEN}ready${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done

    # Initialize database
    echo ""
    echo -e "${BLUE}Initializing database...${NC}"
    docker exec chatsdk-api npm run migrate 2>/dev/null || true

    if [[ "${CONFIG[include_postgres]}" == "true" ]]; then
        docker exec -i chatsdk-postgres psql -U chatsdk -d chatsdk < "$CREDENTIALS_DIR/bootstrap.sql" 2>/dev/null || true
    fi

    # Seed demo data if requested
    if [[ "${CONFIG[include_demo_data]}" == "true" ]]; then
        echo ""
        echo -e "${BLUE}Seeding demo data...${NC}"
        if command -v node &> /dev/null; then
            node "$SCRIPT_DIR/scripts/seed-demo-data.mjs" 2>/dev/null || true
        fi
    fi
fi

# ============================================================================
# Create Integration Guide
# ============================================================================

cat > "$CREDENTIALS_DIR/INTEGRATION.md" << EOF
# ChatSDK Integration Guide

## Your API Key
\`\`\`
$APP_API_KEY
\`\`\`

## Endpoints
- API: http://localhost:${CONFIG[api_port]}
- WebSocket: ws://localhost:${CONFIG[ws_port]}/connection/websocket

## Quick Start

### Create a User Token
\`\`\`bash
curl -X POST http://localhost:${CONFIG[api_port]}/tokens \\
  -H "X-API-Key: $APP_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"userId": "user-1", "name": "John Doe"}'
\`\`\`

### React Integration
\`\`\`tsx
import { ChatProvider } from '@chatsdk/react';

<ChatProvider
  apiUrl="http://localhost:${CONFIG[api_port]}"
  token={userToken}
>
  <YourChatComponent />
</ChatProvider>
\`\`\`

### Vanilla JavaScript
\`\`\`javascript
import { ChatClient } from '@chatsdk/core';

const client = new ChatClient({
  apiUrl: 'http://localhost:${CONFIG[api_port]}',
  wsUrl: 'ws://localhost:${CONFIG[ws_port]}/connection/websocket',
  token: userToken,
});

await client.connect();
\`\`\`

## CORS Origins Configured
${CONFIG[cors_origins]}

To add more origins, edit \`.env.production\` and restart.
EOF

# ============================================================================
# Mark Complete
# ============================================================================

touch "$SCRIPT_DIR/.setup-complete"

# ============================================================================
# Final Output
# ============================================================================

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
echo -e "${BOLD}${CONFIG[app_name]} is ready!${NC}"
echo ""
echo -e "${CYAN}Endpoints:${NC}"
echo -e "  API:       ${GREEN}http://localhost:${CONFIG[api_port]}${NC}"
echo -e "  WebSocket: ${GREEN}ws://localhost:${CONFIG[ws_port]}/connection/websocket${NC}"
if [[ "${CONFIG[include_minio]}" == "true" ]]; then
    echo -e "  MinIO:     ${GREEN}http://localhost:${CONFIG[minio_port]}${NC}"
fi
echo ""
echo -e "${CYAN}Your API Key:${NC}"
echo -e "  ${YELLOW}$APP_API_KEY${NC}"
echo ""
echo -e "${CYAN}Files Created:${NC}"
echo -e "  credentials/secrets.json     ${DIM}# All secrets${NC}"
echo -e "  credentials/INTEGRATION.md   ${DIM}# Quick start guide${NC}"
echo -e "  chatsdk.config.json          ${DIM}# Reusable config${NC}"
echo -e "  .env.production              ${DIM}# Environment vars${NC}"
echo ""

if [[ "${CONFIG[ui_framework]}" != "none" ]]; then
    echo -e "${CYAN}UI Setup:${NC}"
    case "${CONFIG[ui_framework]}" in
        vite)
            echo -e "  ${DIM}./create-chat-app.sh my-app${NC}"
            echo -e "  ${DIM}cd my-app && npm install && npm run dev${NC}"
            ;;
        nextjs)
            echo -e "  ${DIM}npx create-next-app my-app${NC}"
            echo -e "  ${DIM}npm install @chatsdk/react${NC}"
            ;;
        components-only)
            echo -e "  ${DIM}npm install @chatsdk/react${NC}"
            echo -e "  ${DIM}import { ChatProvider, useMessages } from '@chatsdk/react'${NC}"
            ;;
    esac
    echo ""
fi

echo -e "${CYAN}Commands:${NC}"
echo -e "  ${DIM}node scripts/test-api-routes.mjs${NC}    # Test API endpoints"
echo -e "  ${DIM}node scripts/seed-demo-data.mjs${NC}     # Add demo data"
echo -e "  ${DIM}./setup.sh --reset${NC}                  # Reset everything"
echo ""
echo -e "${GREEN}Happy chatting!${NC}"
echo ""
