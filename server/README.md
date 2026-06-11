# @zileo-mcp-thunderbird/server

MCP server component of [Zileo MCP — Thunderbird](../README.md): exposes 56 MCP tools
and 6 resources over stdio, and talks to the Thunderbird extension through the
WebSocket bridge (`bridge-standalone.ts`, port 9876).

```bash
npm run dev        # tsx watch (development)
npm run build      # compile to dist/ (tests excluded)
npm test           # vitest suite
npm run coverage   # vitest --coverage (v8)
```

See the [root README](../README.md) for installation, configuration and
architecture, and [docs/api/](../docs/api/) for the tool reference.
