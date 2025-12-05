# Quick Start Guide - Thunderbird MCP Extension

Get the extension running in under 5 minutes.

## Prerequisites Check

```bash
# Verify Thunderbird is installed
thunderbird --version  # Should be 128.0+

# Check extension files
cd /home/seb-hp/apps/Thunderbird-mcp/extension
ls manifest.json background.js  # Should exist
```

## Step 1: Generate Icons (Optional)

If you have ImageMagick:
```bash
cd icons
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 96x96 icon-96.png
```

Or temporarily remove icons from manifest:
```bash
# Edit manifest.json and remove the "icons" section
```

## Step 2: Load Extension

1. Start Thunderbird
2. Press `Ctrl+Shift+A` (or Tools > Add-ons and Themes)
3. Click the gear icon, select "Debug Add-ons"
4. Click "Load Temporary Add-on"
5. Navigate to: `/home/seb-hp/apps/Thunderbird-mcp/extension/`
6. Select `manifest.json`
7. Click "Open"

## Step 3: Verify Installation

1. Press `Ctrl+Shift+J` to open Browser Console
2. Look for these messages:
   ```
   [MCP] Thunderbird MCP Extension starting...
   [MCP] Version: 1.0.0
   [MCP] Connecting to native messaging host: thunderbird_mcp
   ```

If you see "Native messaging disconnected", that's normal - the MCP server isn't running yet.

## Step 4: Test APIs (Without MCP Server)

Open Browser Console (`Ctrl+Shift+J`) and run:

```javascript
// Test 1: List accounts
const accounts = await messenger.accounts.list();
console.log('Accounts:', accounts);

// Test 2: List unread messages
const messages = await messenger.messages.query({ unread: true });
console.log('Unread:', messages.messages.length);

// Test 3: List address books
const addressBooks = await messenger.addressBooks.list();
console.log('Address books:', addressBooks);

// Test 4: List tags
const tags = await messenger.messages.tags.list();
console.log('Tags:', tags);
```

All tests should work without errors.

## Step 5: Setup Native Messaging (For MCP Integration)

### Linux/macOS

```bash
# Create native messaging host directory
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

# Verify manifest
cat ~/.mozilla/native-messaging-hosts/thunderbird_mcp.json
```

**Important**: Update the `path` to point to your actual MCP server executable.

### Windows

Create file: `C:\Users\YourName\AppData\Roaming\Mozilla\NativeMessagingHosts\thunderbird_mcp.json`

```json
{
  "name": "thunderbird_mcp",
  "description": "Thunderbird MCP Server Native Host",
  "path": "C:\\Program Files\\ThunderbirdMCP\\thunderbird-mcp-host.exe",
  "type": "stdio",
  "allowed_extensions": ["thunderbird-mcp@assistance-micro-design.com"]
}
```

Then add registry key:
```cmd
REG ADD "HKEY_CURRENT_USER\Software\Mozilla\NativeMessagingHosts\thunderbird_mcp" /ve /t REG_SZ /d "C:\Users\YourName\AppData\Roaming\Mozilla\NativeMessagingHosts\thunderbird_mcp.json" /f
```

## Step 6: Start MCP Server

Navigate to the server directory and start:

```bash
cd /home/seb-hp/apps/Thunderbird-mcp/server
npm install  # First time only
npm start
```

Or if using the compiled binary:
```bash
/usr/local/bin/thunderbird-mcp-host
```

## Step 7: Verify Connection

In Thunderbird Browser Console, you should see:
```
[MCP] Native messaging connected successfully
```

## Common Issues

### Extension Won't Load
```bash
# Check JSON syntax
cat manifest.json | python3 -m json.tool

# Verify all files exist
ls -R
```

### Native Messaging Error
```bash
# Check manifest exists
ls -la ~/.mozilla/native-messaging-hosts/thunderbird_mcp.json

# Check permissions
chmod 644 ~/.mozilla/native-messaging-hosts/thunderbird_mcp.json

# Verify path in manifest
cat ~/.mozilla/native-messaging-hosts/thunderbird_mcp.json | grep path
```

### Icons Missing
Either generate PNG files:
```bash
cd icons
convert -background none icon.svg -resize 48x48 icon-48.png
convert -background none icon.svg -resize 96x96 icon-96.png
```

Or remove icons section from manifest.json (lines 23-26).

## Testing Individual APIs

### Messages API
```javascript
// Search unread emails
const msgs = await messenger.messages.query({ unread: true });
console.log('Found:', msgs.messages.length);

// Get first account's inbox
const accounts = await messenger.accounts.list();
const inbox = accounts[0].folders.find(f => f.type === 'inbox');
const messages = await messenger.messages.list(inbox);
console.log('Inbox messages:', messages);
```

### Folders API
```javascript
// List all folders
const accounts = await messenger.accounts.list();
for (const account of accounts) {
  console.log(`Account: ${account.name}`);
  for (const folder of account.folders) {
    console.log(`  - ${folder.name}`);
  }
}
```

### Contacts API
```javascript
// List all address books and contacts
const books = await messenger.addressBooks.list();
for (const book of books) {
  console.log(`Address book: ${book.name}`);
  const contacts = await messenger.contacts.list(book.id);
  console.log(`  Contacts: ${contacts.length}`);
}
```

## Next Steps

1. Review [README.md](README.md) for detailed API documentation
2. See [INSTALL.md](INSTALL.md) for production installation
3. Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details
4. Build the MCP server component (see `/server` directory)
5. Test end-to-end integration with an AI assistant

## Troubleshooting Commands

```bash
# Check Thunderbird logs
tail -f ~/.thunderbird/*.default-release/crashes/

# Monitor extension console
# Keep Browser Console open: Ctrl+Shift+J

# Reload extension after changes
# In about:debugging, click "Reload"

# Check native messaging manifest
cat ~/.mozilla/native-messaging-hosts/thunderbird_mcp.json
```

## Support

- Issues: https://github.com/assistance-micro-design/thunderbird-mcp/issues
- Docs: See README.md and INSTALL.md
- API: https://webextension-api.thunderbird.net/en/mv3/

## Success Indicators

You're ready when you see:
- Extension loads without errors
- Browser Console shows `[MCP]` logs
- APIs respond in console tests
- Native messaging connects (if MCP server running)

Time to start: ~5 minutes
Time to full integration: ~15 minutes (with MCP server)
