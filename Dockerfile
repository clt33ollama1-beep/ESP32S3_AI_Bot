# ==========================================
# Multi-stage Dockerfile for Xiaozhi MCP Center
# ==========================================

# ------------------------------------------
# Stage 1: Build the Vite Client & Assets
# ------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for compiling
COPY package.json ./
RUN npm install

# Copy source code and build config
COPY tsconfig.json vite.config.ts index.html metadata.json ./
COPY src/ ./src/
COPY server/ ./server/
COPY server.ts ./

# Build production frontend bundle into /app/dist
RUN npm run build

# ------------------------------------------
# Stage 2: Lightweight Production Runtime
# ------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server code and configs
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Use non-root node user for container security
USER node

# Expose the standard MCP Center port
EXPOSE 3000

# Health check to ensure the MCP server is actively responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/plugins || exit 1

# Start the full-stack server
CMD ["npm", "run", "start"]
