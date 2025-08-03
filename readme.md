# Spectral Codex

This repository contains the working Astro project used to generate the [Spectral Codex](https://spectralcodex.com) website.

## Features

### Content Management

- All content is authored in MDX using the Content Layer API
- Comprehensive validation system ensuring data quality and consistency across collections (including frontmatter field and GPS coordinate de-duplication checks)
- Visual reading progress indicator for long-form content
- Automated content excerpt generation for previews and listings

### Image Handling

- Experimental image loader treating individual images as first-class content with metadata
- Automatic extraction of camera settings, GPS coordinates, and other EXIF data from images
- Automatic generation of data URI-encoded low-quality image placeholders (LQIPs) for improved perceived performance
- Custom Astro integration for serving local images over localhost to reduce the memory burden of Rollup-based builds
- Customer remark plugin to handle advanced image layout
- Hero image support with optional CSS-only image carousels

### Interactive Maps

- React-based map component built with [MapLibre](https://maplibre.org/), [react-map-gl](https://visgl.github.io/react-map-gl/), and [Protomaps](https://protomaps.com/)
- Custom filter controls for adjusting what points are visible on the map
- Popups, clustering, filtering by objectives, and responsive design
- Administrative boundaries are sourced from [Overture Maps](https://docs.overturemaps.org/) and converted to FlatGeobuf files for rending on region maps
- Persistent storage of map data via IndexedDB

### Search & Discovery

- Integrated [Pagefind](https://pagefind.app/) via [astro-pagefind](https://github.com/shishkin/astro-pagefind) for client-side full-text search across all content
- LLM-powered related content recommendations using vector similarity
- Automatic discovery and display of content relationships via backlinks
- Hierarchical navigation through regions, themes, and series
- Distance-based point-of-interest discovery via nearby locations

### Internationalization

- Custom CJK character handling and language-specific styling
- Not fully internationalized; the goal of the project is to display multiple scripts on the same page without compromising aesthetics

## SEO & RSS

- Comprehensive meta tags, structured data, and OpenGraph images
- Dynamic sitemap generation with [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
- Full RSS feeds built with [@astrojs/rss](https://docs.astro.build/en/recipes/rss/) and the experimental Container API

## Usage

Standard Astro commands apply; use `pnpm astro dev` to fire up the development server and `pnpm astro build` to generate a build. Deployment is handled by custom scripts invoked by `pnpm deploy-static` (but you'd need to modify this script for your own needs; it won't work out of the box).

### MDX Configuration

- `tsconfig` should also specify the remark plugin toolchain Astro uses (and the user may modify) to lint Markdown and MDX files
- ESLint should be used to lint and format MDX files; Prettier support for MDX is not comprehensive and errors will be introduced when using it as the MDX formatter

### Image Assets

Keep original image assets in the media folder specified in `.env`. High-quality JPG or lossless PNG format images at 2400+ pixels on the long edge are recommended. Current standard is mostly based on 3,600 pixel JPGs saved at maximum quality in Lightroom.

## Project Structure

- `./public`: contains a favicon, fallback Open Graph images, and map data
- `./scripts`: deployment and maintenance scripts
- `./src`: primary project source files
- `./src/components`: Astro components organized by functionality
- `./src/layouts`: layouts for different content types and page structures
- `./src/lib`: TypeScript utility code organized by feature area
- `./src/lib/collections`: Content Layer API configuration and data handling
- `./src/pages`: Astro routes including static API endpoints
- `./src/styles`: CSS files including Tailwind configuration and custom styles

### Packages

- `./packages/content-example`: example content for testing and demonstration purposes ([more info](./packages/content-example/readme.md))
- `./packages/image-loader`: experimental image loader; treats image files as actual content and optionally reads EXIF metadata and generates low-quality image placeholders (LQIPs) ([more info](./packages/image-loader/readme.md))
- `./packages/image-open-graph`: experimental OpenGraph image generator using Satori ([more info](./packages/image-open-graph/readme.md))
- `./packages/local-image-server`: simple Astro integration that hosts local images so they can be consumed by the Astro image optimization pipeline as if they were remote images ([more info](./packages/local-image-server/readme.md))
- `./packages/map-types`: TypeScript type definitions for map-related data structures
- `./packages/react-map-component`: interactive map component used across this project
- `./packages/remark-img-group`: Remark plugin for handling image groups
- `./packages/scripts`: utility scripts for related content, content processing, map spritesheet generation, and project maintenance
- `./packages/unified-tools`: utilities for processing markdown, HTML, and text content

### Generated/Temporary

- `./astro`: automatically generated types and schemas
- `./dist`: output folder, automatically generated; delete this anytime
- `./public/divisions`: FlatGeobuf files for geographic divisions used by the map component
- `./public/fonts`: required for generating OpenGraph images using Satori
- `./public/icons`: icon sprites and JSON files for the map component
- `./temp`: temporary storage for generated files, delete anytime

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and adapt the code (but not the personal content specific to the project) for your own projects.
