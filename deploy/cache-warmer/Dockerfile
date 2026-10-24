FROM node:24.22.1-alpine

WORKDIR /app
COPY package.json cache-warm.ts ./

USER node
ENTRYPOINT ["node", "cache-warm.ts"]
