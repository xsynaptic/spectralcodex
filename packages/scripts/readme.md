# Spectral Codex Scripts

Internal tooling for [Spectral Codex](https://spectralcodex.com) content processing, deployment, and asset generation. Built for Astro-based content collections with geographic and semantic analysis capabilities.

## Content Processing

### `similar-content`

Generates semantic similarity scores between content entries using transformer-based embeddings.

Processes MDX content into embeddings via [Transformers.js](https://huggingface.co/docs/transformers.js), combining cosine similarity with metadata-based scoring boosts (shared themes/regions). Results cached with content digest hashes via Keyv to skip regeneration for unchanged files.

Output: JSON mapping of content IDs to ranked similar items.

### `validate-content`

Runs validation checks against content:

- `location-regions` - region references valid
- `location-coordinates` - coordinates inside assigned regions
- `location-overlap` - locations not too close together
- `location-duplicates` - no duplicate titles/addresses
- `divisions` - division IDs exist in Overture
- `quality` - quality scores and completeness
- `mdx` - MDX component syntax valid
- `images` - image references exist

Run with no arguments to execute all checks (used in CI/deploy).

### `content-schemas`

Copies generated Astro content collection schemas from `.astro/collections` to the content package.

## OpenGraph Images

### `og-image`

Advanced OG image generator using [Takumi](https://takumi.kane.tw) for text overlay on images. Renders title + subtitle (CJK support via Noto Serif TC) with gradient background effects. Sharp decodes each source photo once per batch and hands Takumi raw pixels; output freshness is tracked per entry via Keyv.

## Map Data

### `map-divisions`

Fetches administrative boundary polygons from [Overture Maps](https://overturemaps.org/) via [DuckDB](https://duckdb.org/) and generates [FlatGeobuf](https://flatgeobuf.org/) files for client-side map rendering with [MapLibre GL JS](https://maplibre.org/).

Reads region metadata to extract Overture division IDs, queries Parquet datasets with bounding box optimization, performs geometric unions for multi-division regions via [Turf.js](https://turfjs.org/), and outputs optimized FlatGeobuf files.

## Development

### `dev-server`

Starts a containerized image server alongside the Astro dev server. Loads `.env.development` for dev-specific overrides. Run with `pnpm dev` from the workspace root.

## Deployment

### `deploy-site`

Full deployment pipeline:

1. `astro sync` - sync content
2. `validate-content` - validate content
3. `generate-redirects` - build redirect pairs
4. `similar-content` - generate similarity data
5. `sitemap-lastmod` - stamp sitemap timestamps
6. `astro build` - build site
7. `og-image` - generate OG images
8. `test-e2e` - smoke tests
9. `deploy-media` - sync media to remote
10. `deploy-app` - transfer built app
11. `deploy-og` - transfer OG images
12. `deploy-caddy` - sync Caddy config and certs
13. health check against the live site
14. cache refresh - detached cache-warmer run on the server

### `deploy-app` / `deploy-media`

Individual deployment scripts for app files and media assets via rsync.

## Cache Warming

The warmer purges the site hostname, warms pages, assets, and map URLs, then scrapes image URLs from the bodies it already fetched. Image warming is incremental; only URLs not warmed by a previous deploy are requested. Imagor URLs are HMAC signatures of the transform path, so they are stable across builds and survive the host-scoped purge.
