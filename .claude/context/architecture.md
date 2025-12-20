# Architecture Overview

## Project Structure

Astro 5 monorepo using pnpm workspaces:

- **Root**: Main Astro application (`src/`, `astro.config.mjs`)
- **packages/**: Workspace packages
  - `astro-build-logger/`: Build logging utilities
  - `content/`: Production content (MDX + media)
  - `content-demo/`: Example content for testing
  - `react-map-component/`: Interactive map component
  - `map-types/`: Map TypeScript types
  - `image-loader/`: Custom image processing
  - `image-open-graph/`: OpenGraph image generation
  - `remark-img-group/`: Custom remark plugin
  - `unified-tools/`: Unified/remark utilities
  - `scripts/`: Build and utility scripts

## Content Collections

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
- **React 19**: Interactive components (use sparingly)
- **Tailwind CSS v4**: Utility-first CSS
- **TypeScript**: Strict typing
- **MapLibre GL JS**: Interactive maps
- **MDX**: Enhanced Markdown
- **Vitest**: Testing framework
