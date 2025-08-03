# Spectral Codex

This repository contains the working Astro project used to generate the [Spectral Codex](https://spectralcodex.com) website.

## Usage

Standard Astro commands apply; use `pnpm astro dev` to fire up the development server and `pnpm astro build` to generate a build. Deployment is handled by custom scripts invoked by `pnpm deploy-static` (but you'd need to modify this script for your own needs; it won't work out of the box).

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
