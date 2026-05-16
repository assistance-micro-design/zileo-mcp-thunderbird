## Summary

Brief description of the change and its motivation.

## Type of Change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (alters existing public behavior)
- [ ] Documentation update
- [ ] Refactor (no behavior change)
- [ ] Security fix

## Changes Made

- Change 1
- Change 2

## Testing

Required commands — all four must exit 0:

```bash
npm run lint && npm run build && npm test && npm run typecheck
```

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] Tested with Thunderbird (version: )
- [ ] Tested with MCP client (name + version: )

## Project Standards Checklist

- [ ] No `any` types added (use proper types or `unknown` + type guards)
- [ ] No `console.log` / `console.error` (use `logger.*` from `utils/logger.ts`)
- [ ] No `@ts-ignore` or `@ts-expect-error`
- [ ] All function parameters and return types are explicit
- [ ] Tool inputs validated with Zod schemas (with `.max()` and `.datetime()` where applicable)
- [ ] Errors wrapped via `nativeErrorToJsonRpc()` and returned with `isError: true`
- [ ] New tools registered in `server/src/tools/index.ts` and follow `thunderbird_[domain]_[action]` naming
- [ ] ESM imports use the `.js` extension
- [ ] Tests added or updated for new tools and behavioral changes
- [ ] `## [Unreleased]` section of `CHANGELOG.md` updated (if user-facing)
- [ ] `THIRD_PARTY_LICENSES.md` is not modified manually (regenerated at release time)
- [ ] Version fields in `package.json`, `server/package.json`, `extension/manifest.json` are not touched

## Related Issues

Closes #(issue number)
