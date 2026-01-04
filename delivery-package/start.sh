#!/bin/bash

###############################################################################
# ChatSDK Guided Setup Script
# Walks you through the complete setup process step-by-step
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                           ║${NC}"
echo -e "${CYAN}║          ${BOLD}ChatSDK Guided Setup${NC}${CYAN}                          ║${NC}"
echo -e "${CYAN}║                                                           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}This script will guide you through ChatSDK setup in 6 steps.${NC}"
echo -e "${YELLOW}Estimated time: 10-15 minutes${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Do NOT skip steps or deployment will fail!${NC}"
echo ""

read -p "Press Enter to begin..."

###############################################################################
# Step 1: Bootstrap (Generate Secrets)
###############################################################################

clear
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Step 1/6: Generate Secrets & Create First App          ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}This step generates:${NC}"
echo "  • JWT_SECRET (for user tokens)"
echo "  • ADMIN_API_KEY (for admin operations)"
echo "  • CENTRIFUGO_TOKEN_SECRET (for WebSocket)"
echo "  • Your first application with API keys"
echo "  • .env.production file"
echo ""
echo -e "${RED}⚠️  This step is REQUIRED - do not skip!${NC}"
echo ""

read -p "Enter your app name (default: My Chat App): " APP_NAME
APP_NAME=${APP_NAME:-"My Chat App"}

echo ""
echo -e "${BLUE}Running bootstrap...${NC}"
echo ""

if node scripts/bootstrap.mjs --app-name="$APP_NAME"; then
    echo ""
    echo -e "${GREEN}✅ Step 1 Complete!${NC}"
    echo ""
    echo -e "${BOLD}Generated files:${NC}"
    echo "  • .env.production (secrets)"
    echo "  • credentials/app-*.json (API key)"
    echo "  • credentials/bootstrap-*.sql (database init)"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Bootstrap failed!${NC}"
    echo -e "${YELLOW}Please fix the error above and run this script again.${NC}"
    exit 1
fi

read -p "Press Enter to continue..."

###############################################################################
# Step 2: Configure Database & S3
###############################################################################

clear
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Step 2/6: Configure Database & S3                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}You need to configure:${NC}"
echo "  • Database credentials (PostgreSQL 14+)"
echo "  • S3 storage (AWS S3, DigitalOcean Spaces, etc.)"
echo ""
echo -e "${YELLOW}Edit .env.production file now${NC}"
echo ""
echo -e "${BOLD}Required settings:${NC}"
echo "  DB_HOST=your-postgres-host.com"
echo "  DB_PASSWORD=your-secure-password"
echo "  S3_ACCESS_KEY=your-s3-key"
echo "  S3_SECRET_KEY=your-s3-secret"
echo "  S3_BUCKET=your-bucket-name"
echo ""

read -p "Open .env.production in your editor? (y/n): " EDIT_ENV

if [[ $EDIT_ENV == "y" || $EDIT_ENV == "Y" ]]; then
    ${EDITOR:-nano} .env.production
fi

echo ""
echo -e "${GREEN}✅ Step 2 Complete!${NC}"
echo ""

read -p "Press Enter to continue..."

###############################################################################
# Step 3: Validate Configuration
###############################################################################

clear
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Step 3/6: Validate Configuration                        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Checking your configuration...${NC}"
echo ""
echo -e "${YELLOW}This will check for common mistakes BEFORE deployment${NC}"
echo ""

if node scripts/validate.mjs; then
    echo ""
    echo -e "${GREEN}✅ Step 3 Complete! Configuration is valid.${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Validation failed!${NC}"
    echo ""
    echo -e "${YELLOW}Please fix the errors above.${NC}"
    echo -e "${YELLOW}You can re-run validation with: node scripts/validate.mjs${NC}"
    echo ""
    read -p "Continue anyway? (not recommended) (y/n): " CONTINUE

    if [[ $CONTINUE != "y" && $CONTINUE != "Y" ]]; then
        echo ""
        echo -e "${YELLOW}Exiting. Fix the errors and run ./start.sh again.${NC}"
        exit 1
    fi
fi

read -p "Press Enter to continue..."

###############################################################################
# Step 4: Start Services
###############################################################################

clear
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Step 4/6: Start Docker Services                         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Starting services:${NC}"
echo "  • PostgreSQL (database)"
echo "  • Centrifugo (WebSocket)"
echo "  • ChatSDK API"
echo "  • Redis (caching)"
echo ""

cd docker

if docker compose -f docker-compose.prod.yml up -d; then
    echo ""
    echo -e "${GREEN}✅ Services started!${NC}"
    echo ""
    echo -e "${YELLOW}Waiting for services to be ready (30 seconds)...${NC}"
    sleep 30
    echo ""
    echo -e "${GREEN}✅ Step 4 Complete!${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Failed to start services!${NC}"
    echo ""
    echo -e "${YELLOW}Check Docker is running: docker ps${NC}"
    exit 1
fi

cd ..

read -p "Press Enter to continue..."

###############################################################################
# Step 5: Initialize Database
###############################################################################

clear
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Step 5/6: Initialize Database                            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Running database migrations...${NC}"
echo ""

if docker exec chatsdk-api npm run migrate; then
    echo ""
    echo -e "${GREEN}✅ Migrations complete!${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Migration failed!${NC}"
    echo -e "${YELLOW}Check logs: docker-compose logs -f api${NC}"
    exit 1
fi

echo -e "${BOLD}Applying bootstrap SQL...${NC}"
echo ""

BOOTSTRAP_SQL=$(ls credentials/bootstrap-*.sql 2>/dev/null | head -1)

if [ -f "$BOOTSTRAP_SQL" ]; then
    if docker exec -i chatsdk-postgres psql -U chatsdk -d chatsdk < "$BOOTSTRAP_SQL"; then
        echo ""
        echo -e "${GREEN}✅ Bootstrap SQL applied!${NC}"
        echo ""
    else
        echo ""
        echo -e "${RED}❌ Bootstrap SQL failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Bootstrap SQL file not found!${NC}"
    echo -e "${YELLOW}Did you run bootstrap (Step 1)?${NC}"
    exit 1
fi

echo -e "${BOLD}Verifying app was created...${NC}"
echo ""

docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk -c "SELECT id, name, substring(api_key, 1, 20) || '...' as api_key FROM app;"

echo ""
echo -e "${GREEN}✅ Step 5 Complete!${NC}"
echo ""

read -p "Press Enter to continue..."

###############################################################################
# Step 6: Verify Deployment
###############################################################################

clear
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Step 6/6: Verify Deployment                              ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Running health check...${NC}"
echo ""

if node scripts/health-check.mjs; then
    echo ""
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo ""
else
    echo ""
    echo -e "${YELLOW}⚠️  Some health checks failed.${NC}"
    echo -e "${YELLOW}Review the errors above.${NC}"
    echo ""
fi

echo -e "${BOLD}Running authentication test...${NC}"
echo ""

if node scripts/test-auth.mjs; then
    echo ""
    echo -e "${GREEN}✅ Authentication test passed!${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Authentication test failed!${NC}"
    echo -e "${YELLOW}Check the errors above.${NC}"
    echo ""
fi

echo -e "${GREEN}✅ Step 6 Complete!${NC}"
echo ""

read -p "Press Enter to see final summary..."

###############################################################################
# Final Summary
###############################################################################

clear
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                           ║${NC}"
echo -e "${CYAN}║          ${BOLD}🎉 ChatSDK Setup Complete!${NC}${CYAN}                     ║${NC}"
echo -e "${CYAN}║                                                           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}All steps completed successfully!${NC}"
echo ""
echo -e "${BOLD}Your ChatSDK deployment is ready to use.${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}📋 What to do next:${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}1. Get your API key:${NC}"
echo "   cat credentials/app-*.json"
echo ""
echo -e "${BOLD}2. Use in your application:${NC}"
echo '   const response = await fetch("http://localhost:5500/tokens", {'
echo '     headers: { "X-API-Key": "your-api-key-here" }'
echo '   });'
echo ""
echo -e "${BOLD}3. Build frontend:${NC}"
echo "   cd examples/react-chat-huly"
echo "   npm install && npm run build"
echo ""
echo -e "${BOLD}4. Read integration guides:${NC}"
echo "   • NextAuth: examples/integrations/README.md"
echo "   • Auth0: examples/integrations/README.md"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}📚 Documentation:${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "   • Authentication: docs/AUTHENTICATION.md"
echo "   • Deployment: docs/DEPLOYMENT.md"
echo "   • API Reference: docs/API_REFERENCE.md"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}🔧 Useful Commands:${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "   node scripts/validate.mjs       # Validate configuration"
echo "   node scripts/health-check.mjs   # Check system health"
echo "   node scripts/test-auth.mjs      # Test authentication"
echo "   docker-compose logs -f api      # View API logs"
echo ""
echo -e "${GREEN}Happy chatting! 🚀${NC}"
echo ""
