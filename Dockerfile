FROM node:22.14.0-bookworm-slim AS base

RUN corepack enable

# Build layer
FROM base AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# Can we find a way to NOT copy all the large image assets from ./package/content/media here?
# Perhaps use a mount-type=bind or something? We don't want to inflate the container
COPY . .

# Build the Astro project into ./dist
RUN pnpm astro build

# Need to move all images outside of the container if they match this Regexp: /^[\w#$%+=@~-]+\.[\w-]{8}_[\w-]+\.(avif|gif|jpg|jpeg|png|webp)$/i;
# # Extract and remove images matching the regex patterns
# RUN mkdir /extracted-images \
# && find dist -type f -regextype posix-extended -regex '.*[\w#$%+=@~-]+\.[\w-]{8}_[\w-]+\.(avif|gif|# jpg|jpeg|png|webp)' -exec mv {} /extracted-images \; \
# && find dist -type f -regextype posix-extended -regex '.*[\w#$%+=@~-]+\.[\w-]{8}\.(avif|gif|jpg|jpeg|png|webp)' -delete

FROM base AS prod

WORKDIR /app

# Question: do we need to copy from the build layer, not just the root?
# Can we put this in the "base" step?
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./

# Do we need to rename the ID to not overwrite the cache?
RUN --mount=type=cache,id=pnpm-prod,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --prod

# Copy built files from the build stage
COPY --from=build /app/dist ./dist

# Is this duplicating some things?
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Use ENTRYPOINT to ensure the server picks up signals
ENTRYPOINT ["node", "dist/server/entry.mjs"]
