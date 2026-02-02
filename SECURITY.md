# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.2.x   | Yes       |
| < 1.2   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue** for security vulnerabilities
2. Send details to the maintainers via private channels
3. Include steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Considerations

### Destructive Operations

This tool can perform destructive operations on your Thunderbird data:

- **Delete emails permanently** - Messages can be deleted without recovery
- **Modify contacts and calendars** - Data can be changed or removed
- **Send emails on your behalf** - Compose and send messages

Always verify operations before execution, especially when using automation.

### Data Privacy

- **Local processing only** - No email content is sent to external servers
- **MCP protocol** - Communication stays between your local MCP client and Thunderbird
- **Logs may contain metadata** - Folder names, message subjects may appear in logs

### Best Practices

1. **Review tool calls** - Verify what operations are being performed
2. **Limit permissions** - Only enable tools you need
3. **Secure your system** - The MCP server has access to your email data
4. **Monitor logs** - Check for unexpected activity

### Network Security

- The WebSocket bridge defaults to localhost only
- Docker deployments should not expose the bridge port publicly
- Use appropriate firewall rules in production environments

## Dependencies

We monitor dependencies for known vulnerabilities:

```bash
npm audit
```

Report any unpatched vulnerabilities through the security reporting process.
