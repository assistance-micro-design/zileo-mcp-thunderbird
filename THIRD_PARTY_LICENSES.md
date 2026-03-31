# Third-Party Licenses

This file lists all third-party dependencies used by Thunderbird MCP Server and their respective licenses, as required by the MIT License.

Generated: 2026-03-31

## Summary by License Type

| License | Count | Notes |
|---------|-------|-------|
| MIT | 225 | Permissive |
| ISC | 14 | Permissive |
| Apache-2.0 | 13 | Permissive |
| BSD-2-Clause | 7 | Permissive |
| BSD-3-Clause | 4 | Permissive |
| Python-2.0 | 1 | Permissive (argparse) |

**Total: 265 packages** (including transitive dependencies). All licenses are permissive and compatible with the project's MIT License.

---

## Production Dependencies (server/)

These packages are shipped in the built application:

| Package | Version | License | Publisher | Repository |
|---------|---------|---------|-----------|------------|
| @modelcontextprotocol/sdk | 1.27.1 | MIT | Anthropic, PBC | https://github.com/modelcontextprotocol/typescript-sdk |
| winston | 3.18.3 | MIT | Charlie Robbins | https://github.com/winstonjs/winston |
| ws | 8.18.3 | MIT | Einar Otto Stangvik | https://github.com/websockets/ws |
| zod | 3.25.76 | MIT | Colin McDonnell | https://github.com/colinhacks/zod |

### Notable Transitive Production Dependencies

| Package | Version | License | Notes |
|---------|---------|---------|-------|
| @hono/node-server | 1.19.9 | MIT | HTTP server (MCP SDK transport) |
| hono | * | MIT | Web framework (MCP SDK transport) |
| logform | * | MIT | Winston log formatting |
| triple-beam | * | MIT | Winston shared symbols |
| @dabh/diagnostics | 2.0.8 | MIT | Winston diagnostics |
| @colors/colors | 1.6.0 | MIT | Terminal colors (Winston) |
| @so-ric/colorspace | 1.1.6 | MIT | Color space conversions (Winston) |
| readable-stream | * | MIT | Stream utilities |
| zod-to-json-schema | 3.25.1 | ISC | Zod schema conversion (MCP SDK) |
| argparse | 2.0.1 | Python-2.0 | Argument parsing |

---

## Dev Dependencies (root + server/)

These packages are used during development only and are NOT shipped:

### Root Monorepo

| Package | Version | License | Repository |
|---------|---------|---------|------------|
| @types/node | 20.19.25 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @typescript-eslint/eslint-plugin | 8.54.0 | MIT | https://github.com/typescript-eslint/typescript-eslint |
| @typescript-eslint/parser | 8.54.0 | MIT | https://github.com/typescript-eslint/typescript-eslint |
| eslint | 9.39.1 | MIT | https://github.com/eslint/eslint |
| typescript | 5.9.3 | Apache-2.0 | https://github.com/microsoft/TypeScript |

### Server Workspace

| Package | Version | License | Repository |
|---------|---------|---------|------------|
| @eslint/js | 9.39.2 | MIT | https://github.com/eslint/eslint |
| @types/ws | 8.18.1 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| globals | 17.3.0 | MIT | https://github.com/sindresorhus/globals |
| tsx | 4.21.0 | MIT | https://github.com/privatenumber/tsx |
| typescript-eslint | 8.54.0 | MIT | https://github.com/typescript-eslint/typescript-eslint |
| vitest | 2.1.9 | MIT | https://github.com/vitest-dev/vitest |

---

## Non-MIT Licensed Packages

### Apache-2.0

Used by ESLint ecosystem packages:

```
@eslint/config-array, @eslint/config-helpers, @eslint/core, @eslint/object-schema,
@eslint/plugin-kit, @humanfs/core, @humanfs/node, @humanwhocodes/module-importer,
@humanwhocodes/retry, typescript
```

### BSD-2-Clause

```
eslint-scope, espree, esrecurse, estraverse, esutils, json-schema-typed, uri-js
```

### BSD-3-Clause

```
esquery, fast-uri, qs, source-map-js
```

### ISC

```
flatted, glob-parent, inherits, isexe, minimatch, once, picocolors, qs,
semver, setprototypeof, siginfo, which, wrappy, zod-to-json-schema
```

### Python-2.0

```
argparse (2.0.1) - Argument parsing library, permissive license
```

---

## Special License Notes

- **Python-2.0** (argparse): This is a permissive license similar to BSD. It allows unrestricted use, modification, and distribution. Compatible with MIT.
- **All Apache-2.0 packages** are dev dependencies (ESLint tooling) except for TypeScript itself. Not shipped in production builds.
- **All BSD packages** are transitive ESLint dependencies. Not shipped in production builds.

---

## License Texts

### MIT License

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Apache License 2.0

The full text is available at: https://www.apache.org/licenses/LICENSE-2.0

### ISC License

```
Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT,
OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS
ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### BSD-2-Clause License

```
Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
```

### BSD-3-Clause License

```
Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
```

---

## Compliance Notes

1. **Attribution**: This file serves as the attribution notice required by the MIT and other open-source licenses.
2. **Source Code**: All dependencies are available at the repository links listed above.
3. **Modifications**: Thunderbird MCP Server does not modify any third-party library source code.
4. **License Compatibility**: All licenses used are permissive and compatible with MIT for the overall project.
5. **Production footprint**: Only 4 direct dependencies ship in production (MCP SDK, Winston, ws, Zod).

---

## Updating This File

Regenerate when dependencies are updated:

```bash
# Summary by license type
npx license-checker --summary

# Full JSON inventory
npx license-checker --json > licenses.json

# Direct dependencies only
npm ls --depth=0
```

---

*Last updated: 2026-03-31*
*Thunderbird MCP Server version: 1.3.1*
