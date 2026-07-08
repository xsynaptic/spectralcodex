# Spectral Codex

This repository contains the working Astro project used to generate the [Spectral Codex](https://spectralcodex.com) website.

## Features

### Content Management

- All content authored in MDX using the Content Layer API
- Quality scoring system (0-5 scale) drives site-wide content prioritization
- Comprehensive validation: frontmatter checks, cross-reference verification, geospatial boundary checking (Turf.js + FlatGeobuf), proximity-based duplicate detection (KDBush), image reference and aspect ratio validation
- Automated excerpt generation for previews and listings
- Metadata index with automatic backlinks discovery from internal links
- Content linting and formatting via [mdxlint](https://github.com/nicholasgasior/mdxlint) and textlint with remark plugins
- Automatic redirect generation from `formerIds` frontmatter into Caddy config
- Media orphan detection for unreferenced images
- Link checker with SQLite persistence, per-domain rate limiting, auto-retry with staleness rechecking, digest-based change detection, and graceful shutdown handling

### Image Handling

**Content Layer Integration**

- Experimental image loader treating individual images as first-class content with metadata extraction
- Automatic extraction of camera settings, GPS coordinates, and other EXIF data from images
- Automatic generation of data URI-encoded low-quality image placeholders (LQIPs)
- Custom remark plugin for advanced image layout (groups, carousels, aspect ratio handling)
- Hero image support with optional CSS-only image carousels

**External Image Server**

Astro's built-in image optimization works well for smaller sites, but this project has 8,000+ high-resolution source images. Processing them all during build leads to memory exhaustion and long build times. The solution: delegate image processing to an external service.

- Keep original image assets in the media folder specified in `.env`; high-quality JPG or lossless PNG format images at 2400+ pixels on the long edge are recommended, and the current standard is mostly based on 3,600 pixel JPGs saved at maximum quality in Lightroom
- [imagor](https://github.com/cshum/imagor) image server (MozJPEG build) handles on-demand resizing, format conversion, and quality adjustment
- Nginx reverse proxy with aggressive caching ensures images are only processed once
- URL-based transformations (e.g., `/{signature}/fit-in/1200x800/filters:format(webp):quality(80)/path/to/image.jpg`) allow flexible sizing without pre-generating variants
- Purpose-built typed imagor URL builder and HMAC-SHA256 signer (the `unpic-imagor` package) generates signed URLs at build time; signing plus rate limiting protects against cache-busting attacks
- Incremental cache warming service with optional email alerts
- Docker Compose orchestration for easy deployment and updates

### Interactive Maps

- React-based map component built with [MapLibre](https://maplibre.org/), [react-map-gl](https://visgl.github.io/react-map-gl/), and [Protomaps](https://protomaps.com/)
- Custom filter controls for adjusting what points are visible on the map
- Popups, clustering, filtering by objectives, and responsive design
- Administrative boundaries sourced from [Overture Maps](https://docs.overturemaps.org/) and converted to FlatGeobuf files for rendering on region maps
- Persistent storage of map data via IndexedDB
- Distance-based discovery via nearby locations, powered by [kdbush](https://github.com/mourner/kdbush) spatial indexing for fast nearest-neighbor queries
- Chunked popup data payloads with image preloading, keeping interaction responsive across thousands of points

### Search & Discovery

- Client-side full-text search via [Pagefind](https://pagefind.app/) and the [astro-pagefind](https://github.com/shishkin/astro-pagefind) integration, a modal interface via [@pagefind/component-ui](https://pagefind.app/docs/ui-usage/), keyboard shortcuts, and retina-ready thumbnails
- Related content recommendations via Transformers.js embeddings (MiniLM, MPNet, BGE-M3), USearch ANN indexing, and hybrid semantic + metadata ranking
- Hierarchical navigation through regions, themes, and series
- Client-side fuzzy 404 suggestions via [fastest-levenshtein](https://github.com/ka-weihe/fastest-levenshtein) with substring-bonus scoring against a build-time content manifest; auto-redirects on near-exact matches

### Timeline & Archives

- Chronological content browsing with yearly, monthly, and daily views
- Intelligent content deduplication across time periods based on created, updated, and visited dates
- Automatic highlight selection using quality scores
- Quality-based filtering with different thresholds for overview vs. detailed views

### User Experience

- Native web components for interactive elements (dark mode toggle, reading progress, image carousels, pagination controls, back-to-top button)
- Dark/light mode toggle with system preference detection and localStorage persistence
- Visual reading progress indicator for long-form content
- Loading progress bar during navigation
- Custom CJK character handling and language-specific styling
- Not fully internationalized; the goal of the project is to display multiple scripts on the same page without compromising aesthetics

### SEO & Social

- Programmatic OG image generation via [Satori](https://github.com/vercel/satori) and Sharp with multilingual font subsetting (Latin, CJK, Thai, Japanese), luminance-aware adaptive text color, and concurrent processing
- Hierarchical deterministic fallback system for entries without a featured image
- Digest-based caching; only regenerates when content or source image changes
- Comprehensive meta tags and structured data
- Custom sitemap integration with accurate per-URL `lastmod` dates derived from git commit history, so change dates survive content moves and rebuilds
- Full RSS feeds with server-side rendered MDX content via Astro's Container API
- Webmention support via [webmention.io](https://webmention.io/) (optional, env-gated)

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
7. OG image generation with Satori and Sharp (reads built HTML)
8. E2E smoke tests
9. Media sync to remote storage
10. Static file transfer via rsync
11. OG image deployment
12. Caddy config and TLS cert sync with reload
13. Health check against the live site
14. CDN cache purge and image cache warming (detached run on the server)

The image server is deployed separately and manually; it is only needed when image server code or Docker config changes.

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and adapt the code (but not the personal content specific to the project) for your own projects.
