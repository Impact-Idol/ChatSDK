#!/bin/bash

###############################################################################
# ChatSDK Delivery Package Creator
# This script builds all components and creates a deployment-ready archive
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_NAME="chatsdk-delivery-package"
PACKAGE_DIR="delivery-package"
VERSION="1.0.0"
BUILD_DATE=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="${PACKAGE_NAME}-v${VERSION}-${BUILD_DATE}.tar.gz"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       ChatSDK Delivery Package Creator v${VERSION}       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Step 1: Build SDK Packages
###############################################################################

echo -e "${YELLOW}[1/7]${NC} Building SDK packages..."

# Build packages in correct order
echo "  → Building @chatsdk/core..."
cd packages/core
npm run build > /dev/null 2>&1 || {
    echo -e "${RED}✗ Failed to build @chatsdk/core${NC}"
    exit 1
}
echo -e "    ${GREEN}✓ @chatsdk/core built${NC}"
cd ../..

echo "  → Building @chatsdk/react..."
cd packages/react
npm run build > /dev/null 2>&1 || {
    echo -e "${RED}✗ Failed to build @chatsdk/react${NC}"
    exit 1
}
echo -e "    ${GREEN}✓ @chatsdk/react built${NC}"
cd ../..

echo "  → Building @chatsdk/react-native..."
cd packages/react-native
npm run build > /dev/null 2>&1 || {
    echo -e "${RED}✗ Failed to build @chatsdk/react-native${NC}"
    exit 1
}
echo -e "    ${GREEN}✓ @chatsdk/react-native built${NC}"
cd ../..

echo "  → Building @chatsdk/api..."
cd packages/api
npm run build > /dev/null 2>&1 || {
    echo -e "${RED}✗ Failed to build @chatsdk/api${NC}"
    exit 1
}
echo -e "    ${GREEN}✓ @chatsdk/api built${NC}"
cd ../..

echo -e "${GREEN}✓ All SDK packages built successfully${NC}"
echo ""

###############################################################################
# Step 2: Clean and Create Delivery Directory
###############################################################################

echo -e "${YELLOW}[2/7]${NC} Preparing delivery package directory..."

# Preserve docs and scripts if they exist
TEMP_DOCS=""
if [ -d "$PACKAGE_DIR/docs" ] || [ -d "$PACKAGE_DIR/scripts" ]; then
    echo "  → Preserving documentation and scripts..."
    TEMP_DOCS=$(mktemp -d)
    [ -d "$PACKAGE_DIR/docs" ] && cp -r "$PACKAGE_DIR/docs" "$TEMP_DOCS/" || true
    [ -d "$PACKAGE_DIR/scripts" ] && cp -r "$PACKAGE_DIR/scripts" "$TEMP_DOCS/" || true
    cp "$PACKAGE_DIR/.env.production.example" "$TEMP_DOCS/" 2>/dev/null || true
    cp "$PACKAGE_DIR/README.md" "$TEMP_DOCS/" 2>/dev/null || true
fi

# Remove old delivery package if exists
if [ -d "$PACKAGE_DIR" ]; then
    echo "  → Removing old package..."
    rm -rf "$PACKAGE_DIR"
fi

# Create directory structure
mkdir -p "$PACKAGE_DIR"/{packages,docker,examples,docs,scripts}

# Restore docs and scripts if they were preserved
if [ -n "$TEMP_DOCS" ]; then
    echo "  → Restoring documentation and scripts..."
    [ -d "$TEMP_DOCS/docs" ] && cp -r "$TEMP_DOCS/docs"/* "$PACKAGE_DIR/docs/" 2>/dev/null || true
    [ -d "$TEMP_DOCS/scripts" ] && cp -r "$TEMP_DOCS/scripts"/* "$PACKAGE_DIR/scripts/" 2>/dev/null || true
    cp "$TEMP_DOCS/.env.production.example" "$PACKAGE_DIR/" 2>/dev/null || true
    cp "$TEMP_DOCS/README.md" "$PACKAGE_DIR/" 2>/dev/null || true
    rm -rf "$TEMP_DOCS"
fi

echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

###############################################################################
# Step 3: Copy SDK Packages
###############################################################################

echo -e "${YELLOW}[3/7]${NC} Copying SDK packages..."

# Copy core package
echo "  → Copying @chatsdk/core..."
mkdir -p "$PACKAGE_DIR/packages/core"
cp -r packages/core/dist "$PACKAGE_DIR/packages/core/"
cp packages/core/package.json "$PACKAGE_DIR/packages/core/"
[ -f packages/core/README.md ] && cp packages/core/README.md "$PACKAGE_DIR/packages/core/" || true

# Copy react package
echo "  → Copying @chatsdk/react..."
mkdir -p "$PACKAGE_DIR/packages/react"
cp -r packages/react/dist "$PACKAGE_DIR/packages/react/"
cp packages/react/package.json "$PACKAGE_DIR/packages/react/"
[ -f packages/react/README.md ] && cp packages/react/README.md "$PACKAGE_DIR/packages/react/" || true

# Copy react-native package
echo "  → Copying @chatsdk/react-native..."
mkdir -p "$PACKAGE_DIR/packages/react-native"
cp -r packages/react-native/dist "$PACKAGE_DIR/packages/react-native/"
cp packages/react-native/package.json "$PACKAGE_DIR/packages/react-native/"
[ -f packages/react-native/README.md ] && cp packages/react-native/README.md "$PACKAGE_DIR/packages/react-native/" || true

# Copy API package (built dist)
echo "  → Copying @chatsdk/api..."
mkdir -p "$PACKAGE_DIR/packages/api"
cp -r packages/api/dist "$PACKAGE_DIR/packages/api/"
cp packages/api/package.json "$PACKAGE_DIR/packages/api/"
[ -f packages/api/README.md ] && cp packages/api/README.md "$PACKAGE_DIR/packages/api/" || true

echo -e "${GREEN}✓ SDK packages copied${NC}"
echo ""

###############################################################################
# Step 4: Copy Docker Configuration
###############################################################################

echo -e "${YELLOW}[4/7]${NC} Copying Docker configuration..."

echo "  → Copying docker files..."
cp -r docker/* "$PACKAGE_DIR/docker/" 2>/dev/null || {
    echo -e "${YELLOW}  ⚠ Some docker files may not exist, continuing...${NC}"
}

# Ensure critical files are present
CRITICAL_FILES=(
    "docker/docker-compose.prod.yml"
    "docker/Dockerfile.api"
    "docker/centrifugo.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$PACKAGE_DIR/$file"
    else
        echo -e "${YELLOW}  ⚠ Warning: $file not found${NC}"
    fi
done

echo -e "${GREEN}✓ Docker configuration copied${NC}"
echo ""

###############################################################################
# Step 5: Copy Example Applications
###############################################################################

echo -e "${YELLOW}[5/7]${NC} Copying example applications..."

echo "  → Copying react-chat-huly..."
if [ -d "examples/react-chat-huly" ]; then
    # Copy source files, exclude node_modules and build artifacts
    rsync -a --exclude='node_modules' \
             --exclude='dist' \
             --exclude='.next' \
             --exclude='.turbo' \
             --exclude='*.log' \
             examples/react-chat-huly/ "$PACKAGE_DIR/examples/react-chat-huly/"

    echo -e "    ${GREEN}✓ react-chat-huly copied${NC}"
else
    echo -e "${YELLOW}  ⚠ react-chat-huly not found${NC}"
fi

echo -e "${GREEN}✓ Example applications copied${NC}"
echo ""

###############################################################################
# Step 6: Copy Documentation
###############################################################################

echo -e "${YELLOW}[6/7]${NC} Copying documentation..."

# Copy generated docs
if [ -d "$PACKAGE_DIR/docs" ]; then
    echo "  → Documentation already in place"
else
    echo -e "${YELLOW}  ⚠ Documentation directory not found${NC}"
fi

# Copy root files
echo "  → Copying configuration templates..."
[ -f "$PACKAGE_DIR/.env.production.example" ] && echo "    ✓ .env.production.example" || echo -e "${YELLOW}    ⚠ .env.production.example not found${NC}"
[ -f "$PACKAGE_DIR/README.md" ] && echo "    ✓ README.md" || echo -e "${YELLOW}    ⚠ README.md not found${NC}"

echo -e "${GREEN}✓ Documentation copied${NC}"
echo ""

###############################################################################
# Step 7: Create Archive
###############################################################################

echo -e "${YELLOW}[7/7]${NC} Creating deployment archive..."

echo "  → Compressing package..."
tar -czf "$ARCHIVE_NAME" "$PACKAGE_DIR" 2>/dev/null

# Get archive size
ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)

echo -e "${GREEN}✓ Archive created: $ARCHIVE_NAME ($ARCHIVE_SIZE)${NC}"
echo ""

###############################################################################
# Summary
###############################################################################

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                Package Created Successfully!          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Package Details:${NC}"
echo -e "  Name:         ${PACKAGE_NAME}"
echo -e "  Version:      ${VERSION}"
echo -e "  Build Date:   ${BUILD_DATE}"
echo -e "  Archive:      ${ARCHIVE_NAME}"
echo -e "  Size:         ${ARCHIVE_SIZE}"
echo ""
echo -e "${GREEN}Package Contents:${NC}"

# List package contents with sizes
echo "  📦 SDK Packages:"
[ -d "$PACKAGE_DIR/packages/core/dist" ] && echo "     ✓ @chatsdk/core" || echo "     ✗ @chatsdk/core (missing)"
[ -d "$PACKAGE_DIR/packages/react/dist" ] && echo "     ✓ @chatsdk/react" || echo "     ✗ @chatsdk/react (missing)"
[ -d "$PACKAGE_DIR/packages/react-native/dist" ] && echo "     ✓ @chatsdk/react-native" || echo "     ✗ @chatsdk/react-native (missing)"
[ -d "$PACKAGE_DIR/packages/api/dist" ] && echo "     ✓ @chatsdk/api" || echo "     ✗ @chatsdk/api (missing)"

echo ""
echo "  🐳 Docker Configuration:"
[ -f "$PACKAGE_DIR/docker/docker-compose.prod.yml" ] && echo "     ✓ docker-compose.prod.yml" || echo "     ✗ docker-compose.prod.yml (missing)"
[ -f "$PACKAGE_DIR/docker/Dockerfile.api" ] && echo "     ✓ Dockerfile.api" || echo "     ✗ Dockerfile.api (missing)"
[ -f "$PACKAGE_DIR/docker/centrifugo.json" ] && echo "     ✓ centrifugo.json" || echo "     ✗ centrifugo.json (missing)"

echo ""
echo "  📱 Examples:"
[ -d "$PACKAGE_DIR/examples/react-chat-huly" ] && echo "     ✓ react-chat-huly" || echo "     ✗ react-chat-huly (missing)"

echo ""
echo "  📚 Documentation:"
[ -f "$PACKAGE_DIR/docs/AUTHENTICATION.md" ] && echo "     ✓ AUTHENTICATION.md" || echo "     ✗ AUTHENTICATION.md (missing)"
[ -f "$PACKAGE_DIR/docs/INSTALLATION.md" ] && echo "     ✓ INSTALLATION.md" || echo "     ✗ INSTALLATION.md (missing)"
[ -f "$PACKAGE_DIR/docs/DEPLOYMENT.md" ] && echo "     ✓ DEPLOYMENT.md" || echo "     ✗ DEPLOYMENT.md (missing)"
[ -f "$PACKAGE_DIR/docs/API_REFERENCE.md" ] && echo "     ✓ API_REFERENCE.md" || echo "     ✗ API_REFERENCE.md (missing)"
[ -f "$PACKAGE_DIR/README.md" ] && echo "     ✓ README.md" || echo "     ✗ README.md (missing)"

echo ""
echo "  🔧 Scripts:"
[ -f "$PACKAGE_DIR/scripts/bootstrap.mjs" ] && echo "     ✓ bootstrap.mjs" || echo "     ✗ bootstrap.mjs (missing)"
[ -f "$PACKAGE_DIR/scripts/test-auth.mjs" ] && echo "     ✓ test-auth.mjs" || echo "     ✗ test-auth.mjs (missing)"

echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Extract the archive:"
echo -e "     ${BLUE}tar -xzf $ARCHIVE_NAME${NC}"
echo ""
echo "  2. Bootstrap (IMPORTANT - Generate secrets & create app):"
echo -e "     ${BLUE}cd $PACKAGE_DIR${NC}"
echo -e "     ${BLUE}node scripts/bootstrap.mjs --app-name=\"Your App Name\"${NC}"
echo ""
echo "  3. Deploy to production:"
echo -e "     ${BLUE}cd docker${NC}"
echo -e "     ${BLUE}docker compose -f docker-compose.prod.yml up -d${NC}"
echo ""
echo "  4. Test authentication:"
echo -e "     ${BLUE}cd ..${NC}"
echo -e "     ${BLUE}node scripts/test-auth.mjs${NC}"
echo ""
echo "  5. Read the documentation:"
echo -e "     ${BLUE}cat docs/AUTHENTICATION.md${NC}"
echo -e "     ${BLUE}cat docs/INSTALLATION.md${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Package ready for delivery!${NC} 🎉"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
