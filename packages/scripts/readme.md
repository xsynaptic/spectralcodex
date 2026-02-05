# Spectral Codex Scripts

Internal tooling for [Spectral Codex](https://spectralcodex.com) content processing, deployment, and asset generation. Built for Astro-based content collections with geographic and semantic analysis capabilities.

## Content Processing

### `content-related`

Generates semantic similarity scores between content entries using transformer-based embeddings.

Processes MDX content into embeddings via [Transformers.js](https://huggingface.co/docs/transformers.js), combining cosine similarity with metadata-based scoring boosts (shared themes/regions). Results cached with content digest hashes via Keyv to skip regeneration for unchanged files.

Output: JSON mapping of content IDs to ranked related items.

### `content-validate`

Runs validation checks against content:

- `slug-mismatch` - filename matches frontmatter slug
- `location-regions` - region references valid
- `location-coordinates` - coordinates inside assigned regions
- `location-overlap` - locations not too close together
- `location-duplicates` - no duplicate slugs/titles/addresses
- `divisions` - division IDs exist in Overture
- `quality` - quality scores and completeness
- `mdx` - MDX component syntax valid
- `images` - image references exist

Run with no arguments to execute all checks (used in CI/deploy).

### `content-schemas`

Copies generated Astro content collection schemas from `.astro/collections` to the content package.

## OpenGraph Images

### `opengraph-image`

Simple OG image generator that resizes featured images to OG dimensions (1200×630). Uses mtime-based caching to skip unchanged images. Output: `public/0g/`

### `opengraph-image-satori`

Advanced OG image generator using [Satori](https://github.com/vercel/satori) for text overlay on images. Renders title + subtitle (CJK support via Noto Serif TC) with gradient background effects. Uses digest-based caching via Keyv. Output: `public/og/`

## Map Data

### `map-divisions`

Fetches administrative boundary polygons from [Overture Maps](https://overturemaps.org/) via [DuckDB](https://duckdb.org/) and generates [FlatGeobuf](https://flatgeobuf.org/) files for client-side map rendering with [MapLibre GL JS](https://maplibre.org/).

Reads region metadata to extract Overture division IDs, queries Parquet datasets with bounding box optimization, performs geometric unions for multi-division regions via [Turf.js](https://turfjs.org/), and outputs optimized FlatGeobuf files.

## Development

### `dev-server`

Starts Docker containers (IPX image server) alongside Astro dev server. Loads `.env.dev` for dev-specific overrides.

## Deployment

### `deploy-site`

Full deployment pipeline:

1. `astro sync` - sync content
2. `content-validate` - validate content
3. `content-related` - generate similarity data
4. `opengraph-image` - generate OG images
5. `astro build` - build site
6. `image-server-manifest` - extract image URLs
7. `deploy-media` - sync media to remote
8. `deploy-app` - transfer built app
9. `image-server-warm` - warm image cache

### `deploy-app` / `deploy-media`

Individual deployment scripts for app files and media assets via rsync.

## Image Server

### `image-server-manifest`

Extracts image URLs from built HTML for cache warming. Supports incremental manifests to track new vs existing URLs across deploys.

### `image-server-warm` / `image-server-warm-new`

Warms IPX image cache on remote server by requesting all URLs (or only new URLs) from the manifest. Runs via SSH with configurable concurrency.
