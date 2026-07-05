FROM node:22.23.1-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY cache-warm.ts ./

USER node
ENTRYPOINT ["node", "--import", "tsx", "cache-warm.ts"]
