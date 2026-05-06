# Build context: a self-contained bundle produced by `pnpm deploy --prod` on the host
# See packages/scripts/src/deploy/deploy-image-server.ts
FROM node:22.22.2-alpine

RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

WORKDIR /app

COPY --chown=nodejs:nodejs . .

USER nodejs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/image-server.mjs"]
