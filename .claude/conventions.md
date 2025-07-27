# Code Style and Conventions

## File Naming

- Use kebab-case for all files and directories
- Use .astro extension for Astro components
- Use .tsx for React components
- Use .ts for TypeScript utilities

## Code Organization

- Functional, declarative programming preferred
- Avoid classes in favor of functions
- Use descriptive variable names with auxiliary verbs
- Prefer named exports for components
- Modularize code to avoid duplication
- Use new lines after declarations to improve code readability

## TypeScript

- Strict TypeScript configuration
- Use proper typing throughout
- Custom schemas for content validation
- Type-safe content collections
- Do not use return types unless they cannot be inferred
- Make use of "satisfies" where appropriate

## Styling

- Tailwind CSS v4 for all styling
- Scoped styles in .astro files only when necessary
- Global styles in `src/styles/global.css`
- Responsive design using Tailwind utilities

## Performance

- Minimize client-side JavaScript
- Use client directives judiciously
- Leverage Astro's static generation
- Optimize images and assets

## Testing

Run tests with `pnpm test` using Vitest. The project uses:

- Global test utilities (describe, expect, etc.)
- TypeScript support in tests
- Vite configuration for testing
