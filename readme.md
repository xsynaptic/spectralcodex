# Spectral Codex

This repository contains the working Astro project used to generate the [Spectral Codex](https://spectralcodex.com) website, a digital garden documenting historical sites, abandoned places, cultural assets, and oddball attractions in Taiwan and the broader region of East and Southeast Asia.

## Features

### Content Management

- All content authored in MDX using the Content Layer API, with strict Zod schemas and generated JSON schemas for editor tooling
- Entry quality scoring on a 1-5 scale, used to prioritize content in listings, chronology highlights, and image fallbacks
- Comprehensive validation: frontmatter checks, cross-collection reference integrity, global ID uniqueness, geospatial boundary checking (Turf.js + FlatGeobuf), proximity-based duplicate detection (KDBush), image reference and aspect ratio validation. Astro only logs bad references, so this runs as a separate script that exits non-zero
- Automated excerpt generation for previews and listings
- Backlinks discovered from the internal `<Link>` component, plus entry counts computed across regions, themes, series, and resources
- Markdown processed by [satteri](https://github.com/bruits/satteri) with plugins for component auto-import, image groups, CJK wrapping, and trailing slashes
- Content linting and formatting via [mdxlint](https://github.com/remcohaszing/mdxlint)
- Automatic redirect generation from `formerIds` frontmatter into Caddy config
- Media orphan detection for unreferenced images
- Link checker with SQLite persistence, per-domain rate limiting, auto-retry with staleness rechecking, digest-based change detection, and graceful shutdown handling

### Image Handling

**Content Layer Integration**

- Images are first-class content entries with metadata read from the files themselves, via [`@xsynaptic/astro-image-loader`](https://github.com/xsynaptic/astro-lab/tree/main/packages/astro-image-loader), written for this project and now maintained separately
- Automatic extraction of camera settings, GPS coordinates, and other EXIF data from images
- Automatic generation of data URI-encoded low-quality image placeholders (LQIPs)
- Satteri plugin for advanced image layout (groups, carousels, aspect ratio handling)
- Hero image support with optional CSS-only image carousels

**External Image Server**

Astro's built-in image optimization works well for smaller sites, but this project has 8,000+ high-resolution source images. Processing them all during build leads to memory exhaustion and long build times. The solution: delegate image processing to an external service, and reference images by URL rather than importing them.

- Keep original image assets in the media folder specified in `.env`; high-quality JPG or lossless PNG format images at 2400+ pixels on the long edge are recommended, and the current standard is mostly based on 3,600 pixel JPGs saved at maximum quality in Lightroom
- [imagor](https://github.com/cshum/imagor) image server (MozJPEG build) handles on-demand resizing, format conversion, and quality adjustment
- Nginx reverse proxy with aggressive caching ensures images are only processed once
- URL-based transformations (e.g., `/{signature}/fit-in/1200x800/filters:format(webp):quality(80)/path/to/image.jpg`) allow flexible sizing without pre-generating variants
- Purpose-built typed imagor URL builder and HMAC-SHA256 signer (the `unpic-imagor` package) generates signed URLs at build time; signing plus rate limiting protects against cache-busting attacks
- Incremental cache warming service with optional email alerts
- Docker Compose orchestration for easy deployment and updates

### Interactive Maps

- React-based map component built with [MapLibre](https://maplibre.org/), [react-map-gl](https://visgl.github.io/react-map-gl/), and [Protomaps](https://protomaps.com/)
- Every mappable feature goes into one global directory built once per compile; each map selects what it needs by region subtree, theme, or explicit list, and small maps skip the fetch and inline their points instead
- Chunked popup data payloads with image preloading, keeping interaction responsive across thousands of points
- Map payloads run through a key-compression codec in its own package, shared by the build script that writes them and the client that reads them
- Popups, clustering, filtering by objectives, and responsive design
- Custom filter controls for adjusting what points are visible on the map
- Administrative boundaries sourced from [Overture Maps](https://docs.overturemaps.org/) and converted to FlatGeobuf files for rendering on region maps
- Persistent storage of map data via IndexedDB, keyed by build version so a deploy invalidates client-cached payloads instead of serving stale points
- Distance-based discovery via nearby locations, powered by [kdbush](https://github.com/mourner/kdbush) spatial indexing for fast nearest-neighbor queries

### Search & Discovery

- Client-side full-text search via [Pagefind](https://pagefind.app/) and the [astro-pagefind](https://github.com/shishkin/astro-pagefind) integration, a modal interface via [@pagefind/component-ui](https://pagefind.app/docs/ui-usage/), keyboard shortcuts, and retina-ready thumbnails
- Related content recommendations via Transformers.js embeddings (MiniLM, MPNet, BGE-M3), USearch ANN indexing, and hybrid semantic + metadata ranking
- Hierarchical navigation through regions, themes, and series
- Client-side fuzzy 404 suggestions via [fastest-levenshtein](https://github.com/ka-weihe/fastest-levenshtein) with substring-bonus scoring against a build-time content manifest; auto-redirects on near-exact matches

### Chronology

- Chronological content browsing by year and month, with a GitHub-style activity graph on each year page
- Intelligent content deduplication across time periods based on created, updated, and visited dates
- Automatic highlight selection using quality scores
- Quality-based filtering with different thresholds for overview vs. detailed views

### User Experience

- Native web components for interactive elements (dark mode toggle, reading progress, loading bar, navigation menu, image carousels, pagination, search toggle, back-to-top button)
- Dark/light mode toggle with system preference detection and localStorage persistence
- Custom CJK character handling and language-specific styling
- Self-hosted variable fonts via Astro's fonts API
- Not fully internationalized; the goal of the project is to display multiple scripts on the same page without compromising aesthetics

### SEO & Social

- Programmatic OG image generation via [Takumi](https://takumi.kane.tw) and Sharp with multilingual font subsetting (Latin, CJK, Thai, Japanese), luminance-aware adaptive text color, and concurrent processing
- Hierarchical deterministic fallback system for entries without a featured image
- Digest-based caching keyed on content, source image, and template version
- Comprehensive meta tags and structured data
- Custom sitemap integration with accurate per-URL `lastmod` dates derived from git commit history, so change dates survive content moves and rebuilds
- Full RSS feeds with server-side rendered MDX content via Astro's Container API

### Analytics

- Self-hosted [Umami](https://umami.is/) site analytics monitoring web vitals performance metrics
- Custom event tracking for search queries, map filter changes, dark mode toggling, and image metadata interactions

## Development

Requirements: current Node LTS, pnpm 11 (see the `packageManager` field in `package.json`), and Docker Desktop (`pnpm dev` boots an imagor/nginx image stack alongside the Astro dev server).

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Without a private content checkout the site runs against the demo content in `packages/content-demo`; leaving the content path variables unset in `.env` defaults there, which is what makes this public repository runnable as-is.

Install the git hooks once with `pnpm exec lefthook install`. The pre-push hook runs `pnpm check`, the repository's quality gate (stylelint, prettier, eslint, types, `astro check`, knip, vitest), which can also be run standalone.

## Build & Deployment

Deployment is handled by custom TypeScript scripts. These are specific to this project's infrastructure but demonstrate some useful patterns. The full pipeline runs:

1. Astro content sync (builds the data store later steps read)
2. Content validation
3. Redirect generation from former content IDs
4. Related content generation (semantic similarity)
5. Sitemap `lastmod` generation from git commit history
6. Astro production build
7. OG image generation with Takumi and Sharp (reads built HTML)
8. E2E smoke tests
9. Media sync to remote storage
10. Static file transfer via rsync
11. OG image deployment
12. Caddy config and TLS cert sync with reload
13. Edge verification: one URL per cache tier checked against its expected `Cache-Control` header, cache-busted so requests reach Caddy instead of the CDN
14. CDN cache purge and cache warming (detached run on the server)

The image server is deployed separately and manually; it is only needed when image server code or Docker config changes.

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and adapt the code (but not the personal content specific to the project) for your own projects.
