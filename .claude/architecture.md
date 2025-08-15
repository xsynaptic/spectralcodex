# Architecture Overview

## Project Structure

This is an Astro 5 project with a monorepo structure using pnpm workspaces:

- **Root**: Main Astro application
  - `src/`: Astro source files
  - `astro.config.mjs`: Astro configuration
- **packages/**: Workspace packages for specialized functionality
  - `content/`: Production content (MDX files and media)
  - `content-demo/`: Example content for testing
  - `react-map-component/`: Interactive map component
  - `map-types/`: Map-related TypeScript types
  - `image-loader/`: Custom image processing
  - `image-open-graph/`: OpenGraph image generation
  - `local-image-server/`: Development image server
  - `remark-img-group/`: Custom remark plugin

## Content Collections

The project uses Astro's Content Collections API with these collections:

- `ephemera`: Short-form content and observations
- `locations`: Geographic location entries
- `pages`: Static pages
- `posts`: Blog posts organized by region
- `regions`: Geographic region definitions
- `series`: Content series groupings
- `themes`: Thematic content groupings
- `images`: Image metadata and processing

## Key Technologies

- **Astro 5**: Static site generator with partial hydration
- **React 19**: For interactive components; avoid using unless necessary
- **Tailwind CSS v4**: Utility-first CSS framework
- **TypeScript**: Strict typing throughout
- **MapLibre GL JS**: Interactive maps
- **MDX**: Enhanced Markdown with components
- **Vite**: Build tool and dev server
- **Vitest**: Testing framework

## Map Integration

The project includes a sophisticated map system:

- Interactive map component using MapLibre GL JS
- Custom map data types and utilities
- Location-based content organization
- Map sprite generation for icons

## Image Processing

Custom image pipeline with:

- Automatic image optimization
- LQIP (Low Quality Image Placeholder) generation
- OpenGraph image generation using Satori (not yet completely implemented)
- Local image server for development and builds

## Content Architecture

- Content stored in workspace packages for modularity and privacy
- MDX files with frontmatter schemas
- Organized by geographic regions and themes
- Custom remark plugins for enhanced functionality

## Development Workflow

1. Content is authored in MDX files within workspace packages
2. Images are processed through custom loaders
3. Map data is generated and served through specialized components
4. Build process optimizes for static generation with selective hydration

## Environment Variables

Key environment variables (see astro.config.mjs):

- `NODE_ENV`: Environment mode
- `DEV_SERVER_URL`: Development server URL
- `PROD_SERVER_URL`: Production server URL
- `MAP_PROTOMAPS_API_KEY`: Map API key
