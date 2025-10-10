# Spectral Codex Scripts

Internal tooling for [Spectral Codex](https://spectralcodex.com) content and map data processing. Built for Astro-based content collections with geographic and semantic analysis capabilities.

## `map-divisions`

Fetches administrative boundary polygons from [Overture Maps](https://overturemaps.org/) and generates [FlatGeobuf](https://github.com/flatgeobuf/flatgeobuf/) files for client-side map rendering.

The script reads region metadata from the content package, extracting Overture division IDs that correspond to administrative boundaries. It queries Overture's Parquet datasets via [DuckDB](https://duckdb.org/), leveraging bounding box optimizations to minimize data transfer. Division geometries are cached locally to avoid redundant API calls on subsequent runs.

For regions with multiple divisions, the script performs geometric unions using [Turf.js](https://turfjs.org/) before outputting optimized FlatGeobuf files. This format provides efficient streaming decode for [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/), enabling boundary overlays without loading entire datasets into memory.

## `content-related`

Generates semantic similarity scores between content entries using transformer-based embeddings with metadata-aware hybrid ranking.

The script processes MDX content into embeddings via [Transformers](https://huggingface.co/docs/transformers.js/en/index). Content is sanitized to remove MDX components and extract plain text, limited to a configurable character threshold to manage token usage.

Similarity calculation combines cosine distance between embedding vectors with metadata-based scoring boosts. Shared themes and regions increase relevance scores, with configurable weight multipliers to balance semantic and taxonomic signals. Results are cached with content hashes to skip regeneration for unchanged files.

Output is a JSON mapping of content IDs to ranked lists of related items, consumed by the main Astro project for "related content" features.

## `content-validate`

Runs validation checks against content files:

- `slug-mismatch`: Ensures filename matches frontmatter slug
- `location-regions`: Validates region references in location entries
- `location-visibility`: Checks visibility/status field consistency
- `divisions`: Verifies division IDs exist in Overture datasets
- `quality`: Audits content quality scores and completeness

## `map-spritesheet`

uilds SDF icon spritesheets for MapLibre markers from Iconify collections. Generates standard and @2x retina sprites using `spreet`.

## `content-schemas`

Copies generated Astro content collection schemas from build artifacts into the content package for external reference.
