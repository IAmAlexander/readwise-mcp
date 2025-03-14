FROM node:16-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the TypeScript project
RUN npm run build

# Runtime stage to reduce image size
FROM node:16-alpine

WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/mcp-manifest.json ./

# Expose port for MCP server
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
