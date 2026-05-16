# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.3.x   | Yes       |
| < 1.3   | No        |

## Reporting a Vulnerability

**Do NOT create public GitHub issues for security vulnerabilities.**

Please report vulnerabilities via:
- [GitHub Security Advisories](https://github.com/assistance-micro-design/thunderbird-mcp/security/advisories/new)

We will respond within 7 days and work with you to understand and resolve the issue.

### Guidelines

1. Include steps to reproduce the vulnerability
2. Allow reasonable time for a fix before public disclosure
3. We will acknowledge security researchers who report valid vulnerabilities (with your permission)

## Scope

### In Scope

Security issues in Thunderbird-MCP code that we will triage and fix:

| Area | Examples |
|------|----------|
| MCP Server | Command injection, unauthorized tool execution, input validation bypass, tier system bypass |
| WebSocket Bridge | Authentication bypass, origin validation bypass, payload attacks, token leakage |
| Tool Authorization | Permission escalation across read/modify/destructive tiers |
| Extension | Handler injection, storage manipulation, XSS in options UI |
| Docker Deployment | Container escape, unintended port exposure, privilege escalation |
| Logging | Sensitive data leakage in logs (email content, subjects, addresses) |

### Out of Scope

Vulnerabilities in upstream components must be reported to their maintainers:

| Area | Report To |
|------|-----------|
| Thunderbird core | [Thunderbird Security](https://www.thunderbird.net/en-US/security/) |
| MCP SDK | [MCP SDK Security](https://github.com/modelcontextprotocol/typescript-sdk/security) |
| Node.js runtime | [Node.js Security](https://nodejs.org/en/security) |
| Docker engine | [Docker Security](https://www.docker.com/security/) |

### Not Applicable

The following are documented design decisions, not vulnerabilities:

| Class | Why it is not in scope |
|-------|------------------------|
| Destructive operations exposed to AI | By design, gated behind the `destructive` permission tier disabled by default. Users opt in explicitly via the extension options page. |
| Local network access without authentication | The bridge listens on `127.0.0.1` only. Reports requiring an attacker on `localhost` with shell access are out of scope (such an attacker already controls Thunderbird directly). |
| MITM on non-localhost deployments | Out of the supported deployment model. Production usage must keep the bridge on localhost or behind an authenticated reverse proxy. |
| Denial of service via legitimate API usage | Rate limiting is in place on `/auth/token`. Abuse of MCP tool calls by a permitted client is treated as a usage issue, not a CVE. |

## Security Measures

### Destructive Operations

This tool can perform destructive operations on your Thunderbird data:

- **Delete emails permanently** - Messages can be deleted without recovery
- **Modify contacts and calendars** - Data can be changed or removed
- **Send emails on your behalf** - Compose and send messages

Always verify operations before execution, especially when using automation.

### Data Privacy

- **Local processing only** - No email content is sent to external servers
- **MCP protocol** - Communication stays between your local MCP client and Thunderbird
- **Logs contain metadata only** - No email content, subjects, or addresses are logged

### Best Practices

1. **Review tool calls** - Verify what operations are being performed
2. **Limit permissions** - Only enable tools you need
3. **Secure your system** - The MCP server has access to your email data
4. **Monitor logs** - Check for unexpected activity

### Network Security

- The WebSocket bridge defaults to localhost only
- Docker deployments should not expose the bridge port publicly
- Use appropriate firewall rules in production environments
- **Origin validation**: WebSocket upgrade requests are validated against an allowlist
  - Allowed: `localhost`, `127.0.0.1`, `[::1]`, `moz-extension://` origins
  - Allowed: no origin (CLI, `docker exec`, native connections)
  - Rejected: all other origins with HTTP 403 Forbidden
- **Payload limits**: WebSocket messages are limited to 5 MiB (close code 1009 on exceeded)

### Error Handling

- Stack traces are never sent to clients (logged locally only)
- Error responses contain message strings only, no full error objects
- Sensitive user data (email content, search queries, subjects) is never logged

## Dependencies

We monitor dependencies for known vulnerabilities:

```bash
npm audit
```

Report any unpatched vulnerabilities through the security reporting process.
