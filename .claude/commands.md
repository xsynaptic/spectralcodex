# Development Commands

## Core Commands

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production (includes type checking)
- `pnpm preview` - Preview production build
- `pnpm check-types` - Run TypeScript type checking
- `pnpm lint` - Run ESLint on all files
- `pnpm test` - Run Vitest tests

## Content-Specific Commands

- `pnpm lint-content` - Lint content packages
- `pnpm lint-content-demo` - Lint content demo package
- `pnpm clean-content-layer` - Clean Astro content layer cache
- `pnpm host-images` - Serve local images for development

## Build and Deployment

- `pnpm deploy-static` - Deploy static build

## Utility Commands

- `pnpm map-divisions` - Extract administrative boundaries from Overture Maps
- `pnpm map-spritesheet` - Generate map icon spritesheet
- `pnpm validate-content` - Run content utility scripts

## Development Notes

- **Always check package.json before installing dependencies** - Many common packages like @types/geojson are already installed
- **First request to dev server is slow** - The initial request after starting `pnpm dev` may take time to respond as the content metadata index will be rebuilt
