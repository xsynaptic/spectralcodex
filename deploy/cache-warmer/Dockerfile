FROM node:24.19.0-alpine

WORKDIR /app
COPY package.json cache-warm.ts ./

RUN mkdir -p /state && chown node:node /state

USER node
ENTRYPOINT ["node", "cache-warm.ts"]
