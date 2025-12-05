#!/bin/bash
#
# Thunderbird MCP Server Installation Script
# Installs the native messaging host and extension
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_NAME="thunderbird_mcp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Thunderbird MCP Server Installation ===${NC}"

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux*)     PLATFORM=linux;;
    Darwin*)    PLATFORM=macos;;
    MINGW*|MSYS*|CYGWIN*)    PLATFORM=windows;;
    *)          PLATFORM=unknown;;
esac

echo "Detected platform: $PLATFORM"

# Set native messaging host directory based on platform
case "$PLATFORM" in
    linux)
        HOST_DIR="$HOME/.thunderbird/native-messaging-hosts"
        ;;
    macos)
        HOST_DIR="$HOME/Library/Mozilla/NativeMessagingHosts"
        ;;
    windows)
        echo -e "${RED}Windows installation requires manual steps.${NC}"
        echo "Please see INSTALL.md for Windows-specific instructions."
        exit 1
        ;;
    *)
        echo -e "${RED}Unknown platform. Please install manually.${NC}"
        exit 1
        ;;
esac

# Create directories
echo "Creating directories..."
mkdir -p "$HOST_DIR"
mkdir -p /usr/local/lib/thunderbird-mcp 2>/dev/null || sudo mkdir -p /usr/local/lib/thunderbird-mcp

# Build the server if not already built
if [ ! -d "$PROJECT_DIR/server/dist" ]; then
    echo "Building server..."
    cd "$PROJECT_DIR"
    npm install
    npm run build
fi

# Copy server files
echo "Installing server files..."
sudo cp -r "$PROJECT_DIR/server/dist" /usr/local/lib/thunderbird-mcp/
sudo cp "$PROJECT_DIR/server/package.json" /usr/local/lib/thunderbird-mcp/
sudo cp -r "$PROJECT_DIR/server/node_modules" /usr/local/lib/thunderbird-mcp/ 2>/dev/null || true

# Create launcher script
echo "Creating launcher script..."
sudo tee /usr/local/bin/thunderbird-mcp > /dev/null << 'EOF'
#!/bin/bash
cd /usr/local/lib/thunderbird-mcp
exec node dist/index.js "$@"
EOF
sudo chmod +x /usr/local/bin/thunderbird-mcp

# Install native messaging manifest
echo "Installing native messaging manifest..."
MANIFEST_PATH="/usr/local/bin/thunderbird-mcp"

cat > "$HOST_DIR/$APP_NAME.json" << EOF
{
  "name": "$APP_NAME",
  "description": "Thunderbird MCP Server Native Host",
  "path": "$MANIFEST_PATH",
  "type": "stdio",
  "allowed_extensions": ["thunderbird-mcp@assistance-micro-design.com"]
}
EOF

echo -e "${GREEN}Native messaging host installed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Open Thunderbird"
echo "2. Go to Add-ons Manager (Tools > Add-ons and Themes)"
echo "3. Click the gear icon and select 'Install Add-on From File...'"
echo "4. Select the extension XPI from: $PROJECT_DIR/dist/"
echo ""
echo -e "${YELLOW}Note: You may need to enable the extension after installation.${NC}"
