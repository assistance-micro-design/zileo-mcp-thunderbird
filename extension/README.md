# @thunderbird-mcp/extension

Thunderbird MailExtension (Manifest V3) component of
[Thunderbird-MCP](../README.md): connects to the WebSocket bridge on
`localhost:9876` and executes `messenger.*` API calls routed by
`routing/handler.js`.

```bash
npm run package    # builds ../releases/thunderbird-mcp-<version>.xpi
```

Install the packaged `.xpi` via Thunderbird > Tools > Add-ons and Themes >
gear icon > Install Add-on From File. Tool permissions (read/modify/
destructive tiers) are managed in the extension options page.

See the [root README](../README.md) and
[docs/guides/extension-installation.md](../docs/guides/extension-installation.md).
