# Stage 1: Build TypeScript and install all dependencies
FROM node:20-alpine AS builder

# Sharp/vips native dependencies for building
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

COPY package.json ./
RUN npm install

COPY src/ ./src/
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --omit=dev

# Stage 2: Production image
FROM node:20-alpine

# Sharp/vips runtime dependencies only
RUN apk add --no-cache vips

# Create non-root user for security
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

WORKDIR /app

# Copy built artifacts and production node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Switch to non-root user
USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
