#!/bin/bash
#
# Thunderbird MCP Packaging Script
# Creates distribution packages for server and extension
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist"
VERSION=$(node -p "require('$PROJECT_DIR/package.json').version")

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Thunderbird MCP Packaging ===${NC}"
echo "Version: $VERSION"

# Create dist directory
mkdir -p "$DIST_DIR"

# Build everything
echo "Building project..."
cd "$PROJECT_DIR"
npm run build

# Package server as npm tarball
echo "Packaging server..."
cd "$PROJECT_DIR/server"
npm pack --pack-destination "$DIST_DIR"
mv "$DIST_DIR/thunderbird-mcp-server-$VERSION.tgz" "$DIST_DIR/thunderbird-mcp-server-$VERSION.tgz" 2>/dev/null || true

# Package extension as XPI
echo "Packaging extension..."
cd "$PROJECT_DIR/extension"

# Check if web-ext is available
if command -v web-ext &> /dev/null; then
    web-ext build --artifacts-dir "$DIST_DIR" --overwrite-dest
else
    echo -e "${YELLOW}web-ext not found. Creating ZIP manually...${NC}"
    # Create XPI (which is just a ZIP)
    zip -r "$DIST_DIR/thunderbird-mcp-extension-$VERSION.xpi" . \
        -x "*.git*" \
        -x "*node_modules*" \
        -x "*.md" \
        -x "*.log"
fi

# Generate checksums
echo "Generating checksums..."
cd "$DIST_DIR"
sha256sum *.tgz *.xpi 2>/dev/null > checksums.sha256 || true

echo ""
echo -e "${GREEN}=== Packaging Complete ===${NC}"
echo ""
echo "Distribution files:"
ls -la "$DIST_DIR"
echo ""
echo "Checksums:"
cat "$DIST_DIR/checksums.sha256" 2>/dev/null || echo "No checksums generated"
