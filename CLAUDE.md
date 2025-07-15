# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production (includes type checking)
- `pnpm preview` - Preview production build
- `pnpm check-types` - Run TypeScript type checking
- `pnpm lint` - Run ESLint on all files
- `pnpm test` - Run Vitest tests

### Content-Specific Commands

- `pnpm lint-content` - Lint content packages
- `pnpm lint-content-demo` - Lint content demo package
- `pnpm clean-content-layer` - Clean Astro content layer cache
- `pnpm host-images` - Serve local images for development

### Build and Deployment

- `pnpm deploy-static` - Deploy static build
- `pnpm generate-map-spritesheet` - Generate map icon spritesheet

### Utility Commands

- `pnpm content-utils` - Run content utility scripts
- `pnpm fetch-geodata` - Extract administrative boundaries from Overture Maps

### Development Notes

- **Always check package.json before installing dependencies** - Many common packages like @types/geojson are already installed
- GeoJSON types are available from @types/geojson package (already installed)

## Architecture Overview

### Project Structure

This is an Astro 5 project with a monorepo structure using pnpm workspaces:

- **Root**: Main Astro application
- **packages/**: Workspace packages for specialized functionality
  - `content/`: Production content (MDX files and media)
  - `content-demo/`: Example content for testing
  - `react-map-component/`: Interactive map component
  - `map-types/`: Map-related TypeScript types
  - `image-loader/`: Custom image processing
  - `image-open-graph/`: OpenGraph image generation
  - `local-image-server/`: Development image server
  - `remark-img-group/`: Custom remark plugin

### Content Collections

The project uses Astro's Content Collections API with these collections:

- `ephemera`: Short-form content and observations
- `locations`: Geographic location entries
- `pages`: Static pages
- `posts`: Blog posts organized by region
- `regions`: Geographic region definitions
- `series`: Content series groupings
- `themes`: Thematic content groupings
- `images`: Image metadata and processing

### Key Technologies

- **Astro 5**: Static site generator with partial hydration
- **React 19**: For interactive components
- **Tailwind CSS v4**: Utility-first CSS framework
- **TypeScript**: Strict typing throughout
- **MapLibre GL JS**: Interactive maps
- **MDX**: Enhanced Markdown with components
- **Vite**: Build tool and dev server
- **Vitest**: Testing framework

### Map Integration

The project includes a sophisticated map system:

- Interactive map component using MapLibre GL JS
- Custom map data types and utilities
- Location-based content organization
- Map sprite generation for icons

### Image Processing

Custom image pipeline with:

- Automatic image optimization
- LQIP (Low Quality Image Placeholder) generation
- OpenGraph image generation using Satori
- Local image server for development

### Content Architecture

- Content stored in workspace packages for modularity
- MDX files with frontmatter schemas
- Organized by geographic regions and themes
- Custom remark plugins for enhanced functionality

### Development Workflow

1. Content is authored in MDX files within workspace packages
2. Images are processed through custom loaders
3. Map data is generated and served through specialized components
4. Build process optimizes for static generation with selective hydration

## Code Style and Conventions

### File Naming

- Use kebab-case for all files and directories
- Use .astro extension for Astro components
- Use .tsx for React components
- Use .ts for TypeScript utilities

### Code Organization

- Functional, declarative programming preferred
- Avoid classes in favor of functions
- Use descriptive variable names with auxiliary verbs
- Prefer named exports for components
- Modularize code to avoid duplication

### TypeScript

- Strict TypeScript configuration
- Use proper typing throughout
- Custom schemas for content validation
- Type-safe content collections
- Do not use return types unless they cannot be inferred
- Make use of "satisfies" where appropriate

### Styling

- Tailwind CSS v4 for all styling
- Scoped styles in .astro files when needed
- Global styles in `src/styles/global.css`
- Responsive design using Tailwind utilities

### Performance

- Minimize client-side JavaScript
- Use client directives judiciously
- Leverage Astro's static generation
- Optimize images and assets

## Testing

Run tests with `pnpm test` using Vitest. The project uses:

- Global test utilities (describe, expect, etc.)
- TypeScript support in tests
- Vite configuration for testing

## Environment Variables

Key environment variables (see astro.config.mjs):

- `NODE_ENV`: Environment mode
- `DEV_SERVER_URL`: Development server URL
- `PROD_SERVER_URL`: Production server URL
- `BUILD_OUTPUT_PATH`: Build output directory
- `MAP_PROTOMAPS_API_KEY`: Map API key

## Common Issues

### Memory Issues

- Use `NODE_OPTIONS=--max-old-space-size=8192` for builds
- Clean content layer cache if experiencing issues
- Delete .astro and temp directories when needed

### Content Updates

- Run `pnpm clean-content-layer` after schema changes
- Restart dev server after content collection changes
- Use `pnpm host-images` for local image development

### Map Development

- Regenerate map spritesheet after icon changes
- Check MAP_PROTOMAPS_API_KEY environment variable
- Verify map data types match expected schemas
