#!/bin/bash

###############################################################################
# ChatSDK Project Cleanup Script
# Moves development cruft to .archive/ folder
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}ChatSDK Project Cleanup${NC}"
echo ""
echo "This will move development artifacts to .archive/ folder"
echo "Your working code will NOT be affected"
echo ""

# Create archive structure if it doesn't exist
mkdir -p .archive/{development-notes,reference-code,old-builds}

###############################################################################
# 1. Move Development Notes (14 .md files)
###############################################################################

echo -e "${YELLOW}[1/4] Archiving development notes...${NC}"

DEV_NOTES=(
    "CLIENT_DELIVERY_SUMMARY.md"
    "DEPLOYMENT_INFO.md"
    "IMPROVEMENTS_SUMMARY.md"
    "PORT_REFERENCE.md"
    "REACT_APP_TESTING.md"
    "REACT_CLIENT_STATUS.md"
    "RUNNING_SERVICES.md"
    "SEND_TO_CLIENT.md"
    "SHARED_SERVICES_CONFIG.md"
    "TIER3_FEATURES.md"
    "TIER4_IMPLEMENTATION_SUMMARY.md"
)

for file in "${DEV_NOTES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" .archive/development-notes/
        echo "  ✓ Moved $file"
    fi
done

echo ""

###############################################################################
# 2. Move Reference Code (1.5GB!)
###############################################################################

echo -e "${YELLOW}[2/4] Archiving reference code (this may take a minute)...${NC}"

if [ -d "assets" ]; then
    mv assets .archive/reference-code/
    echo "  ✓ Moved assets/ (Huly, Raven, Zulip reference code)"
fi

if [ -d "research" ]; then
    mv research .archive/reference-code/
    echo "  ✓ Moved research/ (OpenIM SDK)"
fi

echo ""

###############################################################################
# 3. Move Old Build Artifacts
###############################################################################

echo -e "${YELLOW}[3/4] Archiving old build artifacts...${NC}"

# Move any tar.gz files
if ls *.tar.gz 1> /dev/null 2>&1; then
    mv *.tar.gz .archive/old-builds/ 2>/dev/null || true
    echo "  ✓ Moved old tar.gz packages"
fi

# Move old env files
if [ -f ".env.shared" ]; then
    mv .env.shared .archive/development-notes/
    echo "  ✓ Moved .env.shared"
fi

if [ -f ".env.production.example" ] && [ -f "delivery-package/.env.production.example" ]; then
    # Keep only the delivery-package version
    mv .env.production.example .archive/development-notes/
    echo "  ✓ Moved duplicate .env.production.example"
fi

echo ""

###############################################################################
# 4. Update .gitignore
###############################################################################

echo -e "${YELLOW}[4/4] Updating .gitignore...${NC}"

if ! grep -q "^\.archive/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Archive directory (development artifacts)" >> .gitignore
    echo ".archive/" >> .gitignore
    echo "  ✓ Added .archive/ to .gitignore"
fi

echo ""

###############################################################################
# Summary
###############################################################################

echo -e "${GREEN}✅ Cleanup Complete!${NC}"
echo ""
echo "Archived:"
echo "  • 11 development note files"
echo "  • assets/ (1.5GB reference code)"
echo "  • research/ (106MB)"
echo "  • Old build artifacts"
echo ""
echo "Your root directory is now clean!"
echo ""
echo -e "${BLUE}New Root Structure:${NC}"
echo ""
tree -L 1 -a --dirsfirst -I 'node_modules|.git' . || ls -la
echo ""
echo "To access archived files: cd .archive/"
