FROM node:24.18.0-alpine

WORKDIR /app
COPY package.json cache-warm.ts ./

USER node
ENTRYPOINT ["node", "cache-warm.ts"]
