# Spectral Codex Scripts

Internal tooling for [Spectral Codex](https://spectralcodex.com): content checks, generated data, OpenGraph images, the local dev stack and deployment. Each script is a `package.json` entry run with `pnpm -F @spectralcodex/scripts <name>`, or through a root alias.

## Content

### `similar-content`

Scores how similar each entry is to every other. Entry text is embedded with [Transformers.js](https://huggingface.co/docs/transformers.js), compared by cosine similarity, and boosted for shared Themes and Regions. Embeddings are cached in SQLite and keyed by each entry's content digest, so unchanged entries are not embedded again. The output is a JSON map from each entry ID to its ranked similar entries.

### `validate-content`

Runs every content check: IDs and references, MDX components, links, images, Location coordinates, overlaps and duplicates, and Region parents. Pass a check's name to run just that one; the names are in `src/validate-content/index.ts`. Only a full run exits with an error, so only a full run can stop a deploy.

### `content-schemas`

Copies the content collection schemas Astro generates in `.astro/collections` into the content package.

## OpenGraph images

### `og-image`

Renders an OpenGraph image for each entry with [Takumi](https://takumi.kane.tw): the title and subtitle over the entry's photo, with Noto Serif TC for CJK text. Sharp decodes each photo once per batch, and a JSON manifest records which images are already up to date.

## Map data

### `map-divisions`

Builds each Region's Division from [Overture Maps](https://overturemaps.org/) boundaries, queried with [DuckDB](https://duckdb.org/) and merged with [Turf.js](https://turfjs.org/) when a Region spans several divisions. Three files per Region land in `.cache/divisions/`:

- the boundary as [FlatGeobuf](https://flatgeobuf.org/), which `validate-content` uses to check Location coordinates
- a simplified mask (the world with the Division cut out) as GeoJSON, which the build serves to the map
- an SVG outline

Regions that already have their files are skipped; `--regenerate` rebuilds them all from the local Overture cache.

## Development

### `dev-server`

Starts the Docker image server and then `astro dev`, and stops the containers when the dev server exits. Run it with `pnpm dev` from the workspace root, which also loads `.env.development`.

## Deployment

### `deploy-site`

Runs the whole deploy in order:

1. `astro sync`
2. `validate-content`
3. `generate-redirects`
4. `similar-content`
5. webmentions, when `WEBMENTIONS_SHOW` is on
6. sitemap `lastmod` dates
7. `astro build`
8. `og-image`
9. the e2e smoke tests
10. `deploy-media`, `deploy-app` and `deploy-og` over rsync
11. `deploy-caddy`, for the Caddy config and certificates
12. a check of the live site's cache headers
13. a cache refresh, started on the server in the background

### `deploy-app`, `deploy-media`, `deploy-og`, `deploy-caddy`

Each runs one deploy step on its own.

## Cache warming

The cache refresh purges the site's hostname, warms its pages, assets and map data, and then warms the image URLs it found in those pages. Image warming is incremental: only URLs no earlier deploy has warmed are requested. Image URLs are signatures of the transform path, so they stay the same across builds, and they live on their own host, which the purge leaves alone.
