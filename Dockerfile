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

# Expose port for SSE transport
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run with SSE transport for hosted deployment
CMD ["node", "dist/index.js", "--transport", "sse"]
