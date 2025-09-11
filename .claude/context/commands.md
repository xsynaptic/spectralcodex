# Development Commands

## Core Commands

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production (includes type checking); this may take 10+ minutes
- `pnpm preview` - Preview production build
- `pnpm check-types` - Run TypeScript type checking
- `pnpm lint` - Run ESLint on all files
- `pnpm test` - Run Vitest tests

## Content-Specific Commands

- `pnpm lint-content` - Lint content packages
- `pnpm lint-content-demo` - Lint content demo package

## Build and Deployment

- `pnpm deploy-static` - Deploy static build; this may take 10+ minutes

## Content Management Commands

- `pnpm content-related` - Generate related content links
- `pnpm content-schemas` - Generate content schemas
- `pnpm content-validate` - Validate content structure and data

## Utility Commands

- `pnpm map-divisions` - Extract administrative boundaries from Overture Maps
- `pnpm map-spritesheet` - Generate map icon spritesheet
- `pnpm clean-build-images` - Clean up build images
- `pnpm host-images` - Serve content media files locally
