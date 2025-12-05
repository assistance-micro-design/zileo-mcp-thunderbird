# Installation Guide - Thunderbird MCP Extension

This guide covers installing the Thunderbird MCP extension in development and production modes.

## Prerequisites

- **Thunderbird**: Version 128.0 or higher
- **Operating System**: Linux, macOS, or Windows
- **MCP Server**: The Node.js MCP server component (see `/server` directory)

## Quick Start (Development Mode)

### 1. Prepare the Extension

```bash
cd /home/seb-hp/apps/Thunderbird-mcp/extension

# Generate icon files (if you have ImageMagick)
convert -background none icons/icon.svg -resize 48x48 icons/icon-48.png
convert -background none icons/icon.svg -resize 96x96 icons/icon-96.png
```

If you don't have ImageMagick, temporarily remove the `icons` section from `manifest.json`.

### 2. Load Extension in Thunderbird

1. Open Thunderbird
2. Navigate to: **Tools** → **Developer Tools** → **Debug Add-ons**
   - Or type in address bar: `about:debugging#/runtime/this-thunderbird`
3. Click **"Load Temporary Add-on"**
4. Browse to `/home/seb-hp/apps/Thunderbird-mcp/extension/`
5. Select `manifest.json`
6. Click **"Open"**

The extension should now appear in the list with status "Temporary extension".

### 3. Verify Installation

1. Open Browser Console: **Tools** → **Developer Tools** → **Browser Console** (Ctrl+Shift+J)
2. Look for log entries starting with `[MCP]`:
   ```
   [MCP] Thunderbird MCP Extension starting...
   [MCP] Version: 1.0.0
   [MCP] Connecting to native messaging host: thunderbird_mcp
   ```

### 4. Common Issues

**Extension won't load:**
- Check manifest.json syntax with a JSON validator
- Verify all API files exist in the correct locations
- Look for errors in Browser Console

**No logs appearing:**
- Ensure Browser Console is open (not Web Console)
- Check that background.js is using correct import paths
- Verify ES modules are supported (type: "module" in manifest)

## Production Installation

### 1. Create Extension Package (XPI)

```bash
cd /home/seb-hp/apps/Thunderbird-mcp/extension

# Ensure icons exist
ls icons/icon-*.png || echo "Create icons first!"

# Create XPI package
zip -r ../thunderbird-mcp.xpi \
  manifest.json \
  background.js \
  api/ \
  native-messaging/ \
  _locales/ \
  icons/ \
  -x "*.md" "*.svg"

# Verify package
unzip -l ../thunderbird-mcp.xpi
```

### 2. Install XPI in Thunderbird

**Method A: Add-ons Manager**
1. Open Thunderbird
2. Go to **Tools** → **Add-ons and Themes** (Ctrl+Shift+A)
3. Click gear icon → **Install Add-on From File**
4. Select `thunderbird-mcp.xpi`
5. Click **"Add"** when prompted

**Method B: Drag and Drop**
1. Open Thunderbird Add-ons Manager
2. Drag `thunderbird-mcp.xpi` into the window
3. Confirm installation

**Method C: Command Line (Linux/macOS)**
```bash
# For default Thunderbird profile
cp thunderbird-mcp.xpi ~/.thunderbird/*.default-release/extensions/thunderbird-mcp@assistance-micro-design.com.xpi

# Restart Thunderbird
```

### 3. Grant Permissions

On first run, Thunderbird will ask for permission to:
- Read messages
- Manage folders
- Access contacts
- Use native messaging

**Accept all permissions** for the extension to function properly.

## Native Messaging Setup

The extension requires the MCP server to be running and accessible via native messaging.

### Linux/macOS

Create native messaging host manifest:

```bash
# Create directory
mkdir -p ~/.mozilla/native-messaging-hosts/

# Create manifest
cat > ~/.mozilla/native-messaging-hosts/thunderbird_mcp.json << 'EOF'
{
  "name": "thunderbird_mcp",
  "description": "Thunderbird MCP Server Native Host",
  "path": "/usr/local/bin/thunderbird-mcp-host",
  "type": "stdio",
  "allowed_extensions": ["thunderbird-mcp@assistance-micro-design.com"]
}
EOF
```

Update `path` to point to your actual MCP server executable.

### Windows

1. Create manifest file at:
   ```
   C:\Users\<YourName>\AppData\Roaming\Mozilla\NativeMessagingHosts\thunderbird_mcp.json
   ```

2. Content:
   ```json
   {
     "name": "thunderbird_mcp",
     "description": "Thunderbird MCP Server Native Host",
     "path": "C:\\Program Files\\ThunderbirdMCP\\thunderbird-mcp-host.exe",
     "type": "stdio",
     "allowed_extensions": ["thunderbird-mcp@assistance-micro-design.com"]
   }
   ```

3. Add registry key (run as Administrator):
   ```cmd
   REG ADD "HKEY_CURRENT_USER\Software\Mozilla\NativeMessagingHosts\thunderbird_mcp" /ve /t REG_SZ /d "C:\Users\<YourName>\AppData\Roaming\Mozilla\NativeMessagingHosts\thunderbird_mcp.json" /f
   ```

## Testing the Extension

### 1. Check Extension Status

Browser Console should show:
```
[MCP] Thunderbird MCP Extension starting...
[MCP] Version: 1.0.0
[MCP] Connecting to native messaging host: thunderbird_mcp
[MCP] Native messaging connected successfully
```

### 2. Test API Functionality

You can test APIs from Browser Console:

```javascript
// Test messages API
const messages = await messenger.messages.query({ unread: true });
console.log('Unread messages:', messages);

// Test folders API
const accounts = await messenger.accounts.list();
console.log('Accounts:', accounts);

// Test contacts API
const addressBooks = await messenger.addressBooks.list();
console.log('Address books:', addressBooks);
```

### 3. Test Native Messaging

Start the MCP server first, then check Browser Console for connection status.

If you see "Native messaging disconnected", check:
- MCP server is running
- Native host manifest path is correct
- Extension ID matches in both manifest files

## Debugging

### Enable Debug Logging

Add to Browser Console:
```javascript
// Enable verbose logging
browser.runtime.onMessage.addListener((msg) => {
  console.log('[DEBUG]', msg);
});
```

### Check Permissions

Browser Console:
```javascript
// Check granted permissions
const permissions = await browser.permissions.getAll();
console.log('Permissions:', permissions);
```

### Inspect Extension

1. Go to `about:debugging#/runtime/this-thunderbird`
2. Find "Thunderbird MCP Server"
3. Click **"Inspect"** to open DevTools

## Uninstallation

### Temporary Extension
1. Go to `about:debugging#/runtime/this-thunderbird`
2. Find extension
3. Click **"Remove"**

### Permanent Extension
1. Go to **Tools** → **Add-ons and Themes**
2. Find "Thunderbird MCP Server"
3. Click **"Remove"**
4. Restart Thunderbird

### Clean Native Messaging

```bash
# Linux/macOS
rm ~/.mozilla/native-messaging-hosts/thunderbird_mcp.json

# Windows
REG DELETE "HKEY_CURRENT_USER\Software\Mozilla\NativeMessagingHosts\thunderbird_mcp" /f
```

## Publishing to AMO

To publish on [addons.thunderbird.net](https://addons.thunderbird.net):

1. Create developer account
2. Package as XPI (see Production Installation)
3. Upload XPI through AMO dashboard
4. Complete listing information
5. Submit for review

Review typically takes 1-3 days.

## Support

- **Issues**: https://github.com/assistance-micro-design/thunderbird-mcp/issues
- **Documentation**: https://github.com/assistance-micro-design/thunderbird-mcp
- **Thunderbird API**: https://webextension-api.thunderbird.net/

## Security Notes

- Extension only accesses data when explicitly called by MCP server
- Native messaging provides sandboxed communication
- All permissions follow Thunderbird's security model
- No data is transmitted outside local system
- Review permissions carefully before granting

## Updates

To update the extension:

1. **Development**: Reload in `about:debugging`
2. **Production**: Install new XPI (will upgrade existing)
3. **Auto-updates**: Configure `update_url` in manifest for automatic updates
