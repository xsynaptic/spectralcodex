FROM node:20.18.0-bookworm-slim AS base

# Generate production dependencies cache; this is required even AFTER building the site
FROM base AS deps

RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build

WORKDIR /app

# Copy the pre-built Astro SSR setup
COPY ./dist/client ./dist/client
COPY ./dist/server ./dist/server

# Copy node modules from the previous step; this is required for the server entry point to function
COPY --from=deps /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

ENTRYPOINT ["node", "dist/server/entry.mjs"]
