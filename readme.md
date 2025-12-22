# Spectral Codex

This repository contains the working Astro project used to generate the [Spectral Codex](https://spectralcodex.com) website.

## Features

### Content Management

- All content is authored in MDX using the Content Layer API
- Content quality scoring system (0-5 scale) drives content prioritization across the site
- Comprehensive validation system ensuring data quality and consistency across collections (including frontmatter field and GPS coordinate de-duplication checks)
- Visual reading progress indicator for long-form content
- Automated content excerpt generation for previews and listings
- Metadata index with automatic backlinks discovery from internal links

### Image Handling

**Content Layer Integration**

- Experimental image loader treating individual images as first-class content with metadata
- Automatic extraction of camera settings, GPS coordinates, and other EXIF data from images
- Automatic generation of data URI-encoded low-quality image placeholders (LQIPs)
- Custom remark plugin for advanced image layout (groups, carousels, aspect ratio handling)
- Hero image support with optional CSS-only image carousels

**External Image Server**

Astro's built-in image optimization works well for smaller sites, but this project has 8,000+ high-resolution source images. Processing them all during build leads to memory exhaustion and long build times. The solution: delegate image processing to an external service.

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
- Administrative boundaries are sourced from [Overture Maps](https://docs.overturemaps.org/) and converted to FlatGeobuf files for rending on region maps
- Persistent storage of map data via IndexedDB
- Distance-based discovery system for geographic content via nearby locations feature

### Search & Discovery

- Integrated [Pagefind](https://pagefind.app/) via [astro-pagefind](https://github.com/shishkin/astro-pagefind) for client-side full-text search across all content
- Related content recommendations using vector similarity (Transformers.js embeddings) with hybrid ranking combining semantic and metadata-based scoring
- Automatic discovery and display of content relationships via backlinks
- Hierarchical navigation through regions, themes, and series
- Distance-based point-of-interest discovery via nearby locations

### Timeline & Archives

- Chronological content browsing with yearly, monthly, and daily views
- Intelligent content deduplication across time periods based on created, updated, and visited dates
- Automatic highlight selection using quality scores
- Quality-based filtering with different thresholds for overview vs. detailed views

### User Experience

- Dark/light mode toggle with system preference detection and localStorage persistence
- Visual reading progress indicator for long-form content
- Loading progress bar during navigation
- Custom CJK character handling and language-specific styling
- Not fully internationalized; the goal of the project is to display multiple scripts on the same page without compromising aesthetics

## SEO & RSS

- Comprehensive meta tags, structured data, and OpenGraph images
- Dynamic sitemap generation with [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
- Full RSS feeds with server-side rendered MDX content via Astro's Container API

## Usage

### Development

Standard Astro commands apply:

- `pnpm dev` - start the development server (includes local image serving)
- `pnpm build` - generate a production build
- `pnpm preview` - preview the production build locally

### Deployment

Deployment is handled by custom scripts. These are specific to this project's infrastructure but demonstrate some useful patterns:

- `pnpm deploy-static` - full deployment pipeline:
  1. Validates content (frontmatter, references, duplicates)
  2. Generates related content recommendations
  3. Creates OpenGraph images
  4. Builds the Astro site
  5. Generates cache manifest from built HTML
  6. Syncs media files to remote storage
  7. Transfers static files via rsync

- `pnpm deploy-media` - sync source images to remote storage (standalone)
- `pnpm cache-warm` - pre-populate image cache on the server
- `pnpm cache-warm --random` - randomized order for better coverage if interrupted

### MDX Configuration

- `tsconfig` should also specify the remark plugin toolchain Astro uses (and the user may modify) to lint Markdown and MDX files
- ESLint should be used to lint and format MDX files; Prettier support for MDX is not comprehensive and errors will be introduced when using it as the MDX formatter

### Image Assets

Keep original image assets in the media folder specified in `.env`. High-quality JPG or lossless PNG format images at 2400+ pixels on the long edge are recommended. Current standard is mostly based on 3,600 pixel JPGs saved at maximum quality in Lightroom.

## Project Structure

- `./deploy`: Docker Compose configuration, Caddy config, and image server setup
- `./public`: contains a favicon, fallback Open Graph images, and map division data
- `./src`: primary project source files
- `./src/components`: Astro components organized by functionality
- `./src/layouts`: layouts for different content types and page structures
- `./src/lib`: TypeScript utility code organized by feature area
- `./src/lib/collections`: Content Layer API configuration and data handling
- `./src/pages`: Astro routes including static API endpoints
- `./src/styles`: CSS files including Tailwind configuration and custom styles

### Packages

- `./packages/astro-build-logger`: Astro integration that logs build timestamps and durations
- `./packages/content-demo`: example content for testing and demonstration purposes ([more info](./packages/content-example/readme.md))
- `./packages/image-loader`: experimental image loader; treats image files as actual content and optionally reads EXIF metadata and generates low-quality image placeholders (LQIPs) ([more info](./packages/image-loader/readme.md))
- `./packages/image-open-graph`: experimental OpenGraph image generator using Satori ([more info](./packages/image-open-graph/readme.md))
- `./packages/map-types`: TypeScript type definitions for map-related data structures
- `./packages/react-map-component`: interactive map component used across this project
- `./packages/remark-img-group`: Remark plugin for handling image groups
- `./packages/scripts`: utility scripts for content validation, related content generation, map division processing, spritesheet generation, cache manifest generation, cache warming, and deployment
- `./packages/unified-tools`: utilities for processing markdown, MDX, HTML, and text content including sanitization, CJK wrapping, and footnote handling

### Generated/Temporary

- `./.astro`: automatically generated types and schemas
- `./dist`: output folder, automatically generated; delete this anytime
- `./public/divisions`: FlatGeobuf files for geographic divisions used by the map component
- `./public/icons`: icon sprites and JSON files for the map component
- `./temp`: temporary storage for generated files, delete anytime

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and adapt the code (but not the personal content specific to the project) for your own projects.
