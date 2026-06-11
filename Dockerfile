# Zileo MCP — Thunderbird Dockerfile
# Multi-stage build for optimized production image

# Version injected into OCI labels (kept in sync by version-coherence.test.ts)
ARG APP_VERSION=1.5.0

# Base image pinned by digest for reproducible builds (node:20-alpine)
ARG NODE_IMAGE=node:20-alpine@sha256:09e2b3d9726018aecf269bd35325f46bf75046a643a66d28360ec71132750ec8

# ============================================
# Stage 1: Build
# ============================================
FROM ${NODE_IMAGE} AS builder

WORKDIR /app

# Copy package files for dependency installation
# (extension/package.json is required: it is an npm workspace referenced
# by package-lock.json, even though only the server is built here)
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY extension/package.json ./extension/

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
FROM ${NODE_IMAGE} AS production
ARG APP_VERSION

# Add labels for container identification
LABEL org.opencontainers.image.title="Zileo MCP — Thunderbird"
LABEL org.opencontainers.image.description="MCP Server for Thunderbird email client integration"
LABEL org.opencontainers.image.version="${APP_VERSION}"
LABEL org.opencontainers.image.vendor="Assistance Micro Design"
LABEL org.opencontainers.image.source="https://github.com/assistance-micro-design/zileo-mcp-thunderbird"

# Create non-root user for security
RUN addgroup -g 1001 -S mcp && \
    adduser -u 1001 -S mcp -G mcp

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/extension/package.json ./extension/

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
# Point file logging at the volume-backed directory (see docker-compose.yml)
ENV LOG_DIR=/app/logs

# Expose WebSocket port for Thunderbird extension connection
EXPOSE 9876

# Health check - verify WebSocket port is listening
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const net = require('net'); const s = new net.Socket(); s.setTimeout(5000); s.connect(9876, '127.0.0.1', () => { s.destroy(); process.exit(0); }); s.on('error', () => process.exit(1)); s.on('timeout', () => { s.destroy(); process.exit(1); });" || exit 1

# Default: Run the standalone bridge server (for Docker deployment)
# The MCP server should be run via 'docker exec' when needed
WORKDIR /app/server
CMD ["node", "dist/bridge-standalone.js"]
