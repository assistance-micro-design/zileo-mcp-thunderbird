# Contributing to Zileo MCP — Thunderbird

Thank you for your interest in contributing to Zileo MCP — Thunderbird.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Thunderbird 128.x or higher

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/assistance-micro-design/zileo-mcp-thunderbird.git
   cd zileo-mcp-thunderbird
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build:

   ```bash
   npm run build
   ```

4. Run linting:
   ```bash
   npm run lint
   ```

## Code Standards

- No `any` types - use proper TypeScript types or `unknown` with type guards
- No `console.log/error` - use the logger utility (`import logger from '../utils/logger.js'`)
- No `@ts-ignore` or `@ts-expect-error` - fix the underlying type error
- All functions must have explicit parameter and return types
- Use Zod schemas for input validation on all tool handlers
- Use `executeToolHandler()` from `tools/tool-handler.ts` for standard handlers
- Follow MCP protocol conventions (snake*case tool names with `thunderbird*` prefix)

### Logging

Always use the logger instead of console:

```typescript
import logger from "../utils/logger.js";

logger.info("Server started");
logger.error("Failed to connect", { error: message });
logger.debug("Processing request", { tool: toolName });
```

### Error Handling

Use error utilities from `utils/errors.ts`:

```typescript
import { nativeErrorToJsonRpc } from "../utils/errors.js";

const jsonRpcError = nativeErrorToJsonRpc(error);
return {
  content: [{ type: "text", text: `Error: ${jsonRpcError.message}` }],
  isError: true,
};
```

## Project Structure

```
zileo-mcp-thunderbird/
├── server/           # MCP server (TypeScript)
│   ├── src/
│   │   ├── tools/    # MCP tool handlers
│   │   ├── resources/# MCP resource handlers
│   │   ├── types/    # TypeScript types
│   │   └── utils/    # Utilities (logger, errors)
│   └── dist/         # Compiled JavaScript
├── extension/        # Thunderbird WebExtension
│   ├── background.js
│   └── manifest.json
└── docs/             # Documentation
```

## Required Checks Before Opening a PR

Run all four checks locally. The CI runs the same set on every PR:

```bash
npm run lint && npm run build && npm test && npm run typecheck
```

Each must exit 0. PRs with failing checks will not be merged.

## What Contributors Must NOT Touch

The following files and fields are reserved for maintainer-driven releases.
PRs that modify them will be rejected unless explicitly coordinated:

- `LICENSE` - license text is fixed (Apache 2.0)
- `NOTICE` - attribution text under Apache 2.0 Section 4
- `THIRD_PARTY_LICENSES.md` - regenerated via `scripts/generate-third-party-licenses.sh` at release time
- `package.json` (`version` field) - bumped only by the maintainer at tag time
- `server/package.json` (`version` field) - same
- `extension/manifest.json` (`version` field) - same
- `CHANGELOG.md` - only the `## [Unreleased]` section is open to PRs; named version sections are immutable history
- Git tags - created exclusively by the maintainer

When adding behavior or fixing a bug, **do** update the `## [Unreleased]`
section of `CHANGELOG.md` under the appropriate Keep a Changelog category
(`Added`, `Changed`, `Fixed`, `Deprecated`, `Removed`, `Security`).

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run the four required checks above
5. Update `## [Unreleased]` in `CHANGELOG.md` if the change is user-facing
6. Commit with a Conventional Commits message
7. Submit a pull request — the PR template will guide you through the checklist

### Commit Message Format

Use conventional commits:

```
feat(tools): add calendar event creation tool
fix(messages): handle empty folder gracefully
docs: update installation instructions
```

## Adding New MCP Tools

1. Define types in `server/src/types/`
2. Create handler in `server/src/tools/`
3. Register in `server/src/tools/index.ts`
4. Add corresponding extension API if needed
5. Update documentation

See [docs/api/](docs/api/) for existing tool patterns and API reference.

## Reporting Issues

Use GitHub Issues with appropriate labels:

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `question` - Questions about usage

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0, the same license as this project.
