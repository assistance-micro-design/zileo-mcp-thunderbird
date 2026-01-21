# Thunderbird MCP Server Dockerfile
# Multi-stage build for optimized production image

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install all dependencies (including devDependencies for build)
RUN npm ci --workspace=server

# Copy source code
COPY server/ ./server/

# Build TypeScript
WORKDIR /app/server
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# Add labels for container identification
LABEL org.opencontainers.image.title="Thunderbird MCP Server"
LABEL org.opencontainers.image.description="MCP Server for Thunderbird email client integration"
LABEL org.opencontainers.image.version="1.1.0"
LABEL org.opencontainers.image.vendor="Assistance Micro Design"
LABEL org.opencontainers.image.source="https://github.com/assistance-micro-design/thunderbird-mcp"

# Create non-root user for security
RUN addgroup -g 1001 -S mcp && \
    adduser -u 1001 -S mcp -G mcp

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/server/package.json ./server/

# Install production dependencies only
RUN npm ci --workspace=server --omit=dev && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/server/dist ./server/dist

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV THUNDERBIRD_PORT=9876

# Expose WebSocket port for Thunderbird extension connection
EXPOSE 9876

# Health check - verify WebSocket port is listening
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const net = require('net'); const s = new net.Socket(); s.setTimeout(5000); s.connect(9876, '127.0.0.1', () => { s.destroy(); process.exit(0); }); s.on('error', () => process.exit(1)); s.on('timeout', () => { s.destroy(); process.exit(1); });" || exit 1

# Default: Run the standalone bridge server (for Docker deployment)
# The MCP server should be run via 'docker exec' when needed
WORKDIR /app/server
CMD ["node", "dist/bridge-standalone.js"]
