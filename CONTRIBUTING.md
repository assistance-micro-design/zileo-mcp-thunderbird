# Contributing to Thunderbird-MCP

Thank you for your interest in contributing to Thunderbird-MCP.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Thunderbird 128.x or higher

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/assistance-micro-design/thunderbird-mcp.git
   cd thunderbird-mcp
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

See `.claude/rules/code-standards.md` for detailed requirements:

- No `any` types - use proper TypeScript types
- No `console.log/error` - use the logger utility
- No `@ts-ignore` or `@ts-expect-error`
- All functions must have explicit types
- Use zod for input validation
- Follow MCP protocol conventions

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
thunderbird-mcp/
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

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run validation:
   ```bash
   npm run lint && npm run build
   ```
5. Commit with a descriptive message
6. Submit a pull request

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

See `docs/thunderbird-mcp-tools.md` for existing tool patterns.

## Reporting Issues

Use GitHub Issues with appropriate labels:

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `question` - Questions about usage

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
