# Spectral Codex

This repository contains the working Astro project used to generate the [Spectral Codex](https://spectralcodex.com) website.

## Features

### Content Management

- All content authored in MDX using the Content Layer API
- Quality scoring system (0-5 scale) drives site-wide content prioritization
- Comprehensive validation ensuring data quality across collections: frontmatter fields, GPS coordinate de-duplication
- Automated excerpt generation for previews and listings
- Metadata index with automatic backlinks discovery from internal links
- Content linting and formatting via [mdxlint](https://github.com/nicholasgasior/mdxlint) with remark plugins
- Link checker that scans external URLs across collections, tracks status, and supports rechecking and filtering to reduce linkrot

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
- [@unjs/ipx](https://github.com/unjs/ipx)-based image server handles on-demand resizing, format conversion, and quality adjustment
- Nginx reverse proxy with aggressive caching ensures images are only processed once
- URL-based transformations (e.g., `/q_80,f_webp,s_1200x800/path/to/image.jpg`) allow flexible sizing without pre-generating variants
- Rate limiting and request validation protect against cache-busting attacks
- Warming script pre-populates the cache after deployment; this runs on the server, making internal requests on localhost
- Docker Compose orchestration for easy deployment and updates

### Interactive Maps

- React-based map component built with [MapLibre](https://maplibre.org/), [react-map-gl](https://visgl.github.io/react-map-gl/), and [Protomaps](https://protomaps.com/)
- Custom filter controls for adjusting what points are visible on the map
- Popups, clustering, filtering by objectives, and responsive design
- Administrative boundaries sourced from [Overture Maps](https://docs.overturemaps.org/) and converted to FlatGeobuf files for rendering on region maps
- Persistent storage of map data via IndexedDB
- Distance-based discovery via nearby locations, powered by [kdbush](https://github.com/mourner/kdbush) spatial indexing for fast nearest-neighbor queries

### Search & Discovery

- Integrated [Pagefind](https://pagefind.app/) via [astro-pagefind](https://github.com/shishkin/astro-pagefind) for client-side full-text search across all content
- Related content recommendations via vector similarity (Transformers.js embeddings) with hybrid semantic + metadata ranking
- Automatic content relationship discovery via backlinks
- Hierarchical navigation through regions, themes, and series

### Timeline & Archives

- Chronological content browsing with yearly, monthly, and daily views
- Intelligent content deduplication across time periods based on created, updated, and visited dates
- Automatic highlight selection using quality scores
- Quality-based filtering with different thresholds for overview vs. detailed views

### User Experience

- Native web components for interactive elements (dark mode toggle, progress bars, image carousels)
- Dark/light mode toggle with system preference detection and localStorage persistence
- Visual reading progress indicator for long-form content
- Loading progress bar during navigation
- Custom CJK character handling and language-specific styling
- Not fully internationalized; the goal of the project is to display multiple scripts on the same page without compromising aesthetics

### SEO & Social

- Programmatic OG image generation via [Satori](https://github.com/vercel/satori) and Sharp; per-page images with featured image backgrounds, multilingual title rendering (CJK/Thai), and luminance-aware adaptive text color
- Deterministic fallback system (theme/region/country) with blurred visual distinction for entries without a featured image
- Digest-based caching; only regenerates when content or source image changes
- Comprehensive meta tags and structured data
- Dynamic sitemap via [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
- Full RSS feeds with server-side rendered MDX content via Astro's Container API

## Usage

### Development

Standard Astro commands apply:

- `pnpm dev` - start the development server (includes local image serving)
- `pnpm build` - generate a production build
- `pnpm preview` - preview the production build locally

### Deployment

Deployment is handled by custom scripts. These are specific to this project's infrastructure but demonstrate some useful patterns. The full pipeline runs:

1. Content sync and validation
2. Redirect generation from former content slugs
3. Related content generation (semantic similarity)
4. OG image generation with Satori and Sharp
5. Astro production build
6. E2E smoke tests
7. Cache manifest generation from built HTML
8. Media sync to remote storage
9. Static file transfer via rsync
10. OG image deployment
11. Caddy config and TLS cert sync with reload
12. CDN cache purge (Cloudflare)
13. New image cache warming

The image server is deployed separately and manually; it is only needed when image server code or Docker config changes.

## Project Structure

- `./deploy`: Deployment configuration split into `infra/` (Caddy, analytics) and `site/` (image server)
- `./public`: contains a favicon, fallback Open Graph images, and map division data
- `./src`: primary project source files
- `./src/components`: Astro components organized by functionality
- `./src/layouts`: layouts for different content types and page structures
- `./src/lib`: TypeScript utility code organized by feature area
- `./src/lib/collections`: Content Layer API configuration and data handling
- `./src/pages`: Astro routes including static API endpoints
- `./src/styles`: CSS files including Tailwind configuration and custom styles

### Packages

- `./packages/astro-build-logger`: build timestamps and durations
- `./packages/content`: primary content collection (private, not included in repo)
- `./packages/content-demo`: example content for testing and demonstration
- `./packages/image-loader`: Content Layer loader for image files with EXIF extraction and LQIP generation
- `./packages/react-map-component`: interactive map component
- `./packages/remark-img-group`: remark plugin for image groups in MDX
- `./packages/scripts`: content validation, semantic similarity, OG images, map divisions, link checking, deployment
- `./packages/shared`: shared utilities, Keyv-based caching (SQLite/file backends), common types and schemas

## Cloudflare Configuration

The site is proxied through Cloudflare. HTML caching requires these dashboard settings:

- **Caching > Configuration**: Browser Cache TTL set to "Respect Existing Headers"
- **Caching > Cache Rules**: "Cache HTML" rule with hostname `spectralcodex.com`, eligible for cache, edge TTL respects origin headers
- **Cache purge**: API credentials in `deploy/.env` (`CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`), runs during `pnpm deploy-site`

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and adapt the code (but not the personal content specific to the project) for your own projects.
