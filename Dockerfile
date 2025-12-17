FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source and build
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies for build, build, then remove
RUN npm install && npm run build && npm prune --production

# Expose port (Smithery will set PORT env var)
EXPOSE 8081

# Health check - use PORT env var or default to 8081
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8081}/health || exit 1

# Run with SSE transport for hosted deployment
# PORT is set by Smithery automatically
CMD ["node", "dist/index.js", "--transport", "sse"]
