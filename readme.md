# Spectral Codex

This repository contains the working [Astro](https://astro.build) project used to generate the [Spectral Codex](https://spectralcodex.com) website, a digital garden documenting historical sites, abandoned places, cultural assets, and often obscure attractions in Taiwan and the broader region of East and Southeast Asia.

## Features

### Content Management

- All content authored in MDX using the Content Layer API, with strict Zod schemas and generated JSON schemas for editor tooling
- Entry quality scoring on a 1-5 scale, used to prioritize content in listings, chronology highlights, and image fallbacks
- Comprehensive validation: frontmatter checks, cross-collection reference integrity, global ID uniqueness, geospatial boundary checking against Overture Maps divisions (Turf.js), proximity-based duplicate detection ([KDBush](https://github.com/mourner/kdbush)), image reference and aspect ratio validation
- Build scripts read `astro:content` outside the Astro runtime via a Vite module runner, so validation, redirects, and OG images see the same parsed collections the site does
- Backlinks discovered from the internal `<Link>` component, plus entry counts computed across regions, themes, series, and resources
- Markdown processed by [Sätteri](https://github.com/bruits/satteri) with plugins for component auto-import, image groups, CJK wrapping, and trailing slashes
- Content linting and formatting via [mdxlint](https://github.com/remcohaszing/mdxlint), plus a check for media files no entry references
- Automatic redirect generation from `formerIds` frontmatter into [Caddy](https://github.com/caddyserver/caddy) config

### Image Handling

**Content Layer Integration**

- Images are first-class content entries with metadata read from the files themselves, via [`@xsynaptic/astro-image-loader`](https://github.com/xsynaptic/astro-lab/tree/main/packages/astro-image-loader), written for this project and now maintained separately
- Camera settings, GPS coordinates and other EXIF data extracted from each image, plus data URI placeholders (LQIPs)
- Satteri plugin for advanced image layout (groups, carousels, aspect ratio handling)
- Hero image support with optional CSS-only image carousels

**Images**

Astro's built-in image optimization works well for smaller sites, but this project has 8,000+ high-resolution source images. Processing them all during the build leads to memory exhaustion and long build times. Images are referenced by URL instead, and their resized copies are built in a separate, incremental step.

- A closed set of presets (content, card, hero, popup, search, feed, author) names every derivative with a stable URL: `/<folder>/<name>-1200.jpg` for width-only sizes, `/<folder>/<name>-900x600.webp` for crops; sizes never exceed the source
- The image build generates a manifest and fails if a published image is missing
- `pnpm render-images` encodes the manifest with [sharp](https://sharp.pixelplumbing.com/), skipping anything whose source and settings are unchanged, and refuses to run against a stale build, a source that changed size, or a mass deletion
- Caddy serves the files as plain static files behind Cloudflare; overwritten or deleted files are purged from the edge
- In development, a middleware renders images on demand, so no image server is needed

### Interactive Maps

- A React map island built on [MapLibre](https://maplibre.org/) and [react-map-gl](https://visgl.github.io/react-map-gl/) over [Protomaps](https://protomaps.com/) basemap tiles, with clustering, status colours, popups, and filters for status, rating, and objectives
- Map points go into a shared directory written once per build. A map carries a rule rather than data (a region subtree, a theme, or a list of IDs), and the build and the browser select rows with the same function from a shared package
- Payloads are encoded with Zod 4 codecs built from one field table per payload, which gives each property its short key and its encoding. Adding a property is one table row, and the script that writes a payload and the client that reads it cannot drift apart
- Payload URLs carry a content hash and are served as immutable, so the browser keeps the directory across pages and a new build replaces it
- Popup details live in geographically contiguous chunks fetched when a point is opened, with the thumbnail preloaded
- Region maps dim everything outside the region's administrative boundary. Boundaries come from [Overture Maps](https://docs.overturemaps.org/); a build script subtracts each one from a world polygon and simplifies the result with a tolerance scaled to its size, so a city ward keeps its detail and a whole country stays light
- Distance-based discovery via nearby locations, powered by [kdbush](https://github.com/mourner/kdbush) spatial indexing for fast nearest-neighbor queries

### Atlas

- A full-screen map at `/atlas` that stays open while you read: on a wide screen it splits into the map and a reading pane, and clicking a point loads its page beside the map. On a narrow screen the page becomes a sheet over the map that can be lowered out of the way
- A draggable, keyboard-accessible divider sets the split, and the chosen width persists between visits
- The atlas is a client-side layout of the existing static pages, not a second set of routes. Breakpoints from `md` up are container queries on the pane, so a page lays out the same in the split as it would on its own at that width
- One MapLibre instance persists across view transitions. A persisted island never receives new props, so each page writes what the map should show (its locations, or a region, theme, or series to limit the map to) into a JSON attribute on the root element, and the map reads it again after every navigation. The map answers through typed DOM events, and its own state lives in a single zustand store
- Map search over every location, plus the regions, themes, and series that can scope the map. Matching works across scripts: tone marks fold away (`hue` finds Huế), variant CJK characters fold together (`台` finds `臺`), and the match is highlighted in the title as written
- A custom client directive (`client:atlas`) holds back MapLibre and its stylesheet until atlas mode is switched on

### Search & Discovery

- Hierarchical navigation through nested regions, plus themes and series
- Client-side full-text search via [Pagefind](https://pagefind.app/) and the [astro-pagefind](https://github.com/shishkin/astro-pagefind) integration, with a modal interface via [@pagefind/component-ui](https://pagefind.app/docs/ui-usage/)
- Related content recommendations via Transformers.js embeddings (MiniLM, MPNet, BGE-M3), USearch ANN indexing, and hybrid semantic and metadata ranking
- Client-side fuzzy 404 suggestions via [@xsynaptic/path-suggestions](https://github.com/xsynaptic/astro-lab/tree/main/packages/path-suggestions) scored against a build-time content manifest; auto-redirects on near-exact matches

### Chronology

- Chronological content browsing by year and month, with a GitHub-style activity graph on each year page
- Intelligent content deduplication across time periods based on created, updated, and visited dates
- Highlights selected by quality score, with separate thresholds for overview and detail pages

### User Experience

- Native web components for interactive elements (dark mode toggle, reading progress, loading bar, navigation menu, image carousels, pagination, search toggle, back-to-top button, atlas divider)
- [Build history charts](https://spectralcodex.com/build-stats): SVG rendered at build time from a JSONL log, with log-scaled durations, a rolling median, and page counts on a second track
- Custom CJK character handling and language-specific styling
- Not fully internationalized; the goal of the project is to display multiple scripts on the same page without compromising aesthetics

### SEO & Social

- Programmatic OG image generation via [Takumi](https://takumi.kane.tw) and Sharp with multilingual font subsetting (Latin, CJK, Thai, Japanese), luminance-aware adaptive text color, and concurrent processing
- Hierarchical deterministic fallback system for entries without a featured image
- Digest-based caching keyed on content, source image, and template version
- JSON-LD structured data (`Article`, `Place` with coordinates, `BreadcrumbList`) emitted as a linked `@graph`
- Sitemap with per-URL `lastmod` dates derived from git commit history, so change dates survive content moves and rebuilds; the indexable-path rule is shared with the content manifest so the two cannot disagree
- Microformats2 markup (`h-entry`, `h-feed`, `h-card`) applied from a single class map across listings and detail pages
- Full RSS feeds with server-side rendered MDX content via Astro's Container API

### Analytics

- Self-hosted [Umami](https://umami.is/) analytics with web vitals and custom events for search, map, and atlas interactions

## Development

Requirements: current Node LTS and pnpm 11 (see the `packageManager` field in `package.json`).

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Without a private content checkout the site runs against the demo content in `packages/content-demo`; leaving the content path variables unset in `.env` defaults there, which is what makes this public repository runnable as-is.

Install the git hooks once with `pnpm exec lefthook install`. The pre-push hook runs the `check` group defined in `lefthook.yml`, the repository's quality gate (stylelint, prettier, eslint, `astro check`, knip, fallow, vitest), which can also be run standalone as `pnpm check`. Fallow also enforces the map package's internal layering, so a lower layer cannot import from a higher one.

Beyond the gate, a Playwright suite drives the built site end to end, including reader journeys through the atlas split and sheet; its smoke-tagged subset runs against the production build before every deploy. Stryker runs mutation testing over the unit tests on demand.

A dev-only `/inventory` route, injected by a local integration, renders the design tokens and most of the component library from real source against fixture data, including live Open Graph cards from the deploy script's own renderer.

## Build & Deployment

Deployment is handled by custom TypeScript scripts. These are specific to this project's infrastructure but demonstrate some useful patterns. The full pipeline runs:

1. Astro content sync (builds the data store later steps read)
2. Content validation
3. Redirect generation from former content IDs
4. Related content generation (semantic similarity)
5. Sitemap `lastmod` generation from git commit history
6. Astro production build
7. Image build (incremental, from the image build's manifest)
8. OG image generation with Takumi and Sharp (reads built HTML)
9. E2E smoke tests
10. Image sync, then an edge purge of any overwritten files
11. Static file transfer via rsync
12. OG image deployment
13. Caddy config and TLS cert sync with reload
14. Edge verification: one URL per cache tier checked against its expected `Cache-Control` header, cache-busted so requests reach Caddy instead of the CDN, plus the image host's headers and legacy redirects
15. CDN cache purge and cache warming (detached run on the server)

The server side runs from one Docker Compose file (`deploy/docker-compose.yml`): Caddy, the cache warmer, and Umami with scheduled database backups.

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and adapt the code (but not the personal content specific to the project) for your own projects.
