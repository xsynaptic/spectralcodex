# Code Style and Conventions

## File Naming

- Use kebab-case for all files and directories
- Use .astro extension for Astro components
- Use .tsx for React components
- Use .ts for TypeScript utilities
- Dynamic route files must use lowercase (e.g., `[...id].astro` not `[...ID].astro`)

## Code Organization

- Functional, declarative programming preferred
- Avoid classes in favor of functions
- Use descriptive variable names with auxiliary verbs
- Prefer named exports for components
- Modularize code to avoid duplication
- Use new lines after declarations to improve code readability
- Check `./src/lib` for existing utilities before creating new ones
- Use path aliases `#` to reference `src/` folder (e.g., `#lib/` means `src/lib/`)

## TypeScript

- Strict TypeScript configuration enforced
- Use proper typing throughout
- Custom schemas for content validation
- Type-safe content collections
- Do not use return types unless they cannot be inferred
- Make use of "satisfies" where appropriate
- Do not ignore TypeScript errors without technical justification

## Images & Media

- All image hosting handled centrally from local sources only for memory efficiency
- Astro uses Vite and hence Rollup for builds; images directly imported cause memory issues
- Consequently, this project hosts source images over localhost, something to keep in mind when moving to a hybrid setup
- Use Sharp directly via project utilities, not other image libraries
- Aggressive lazy loading by default except above-the-fold cases

## Styling

- Use Tailwind CSS v4 for all styling
- Use scoped styles in .astro files only when necessary
- Place global styles in `src/styles/global.css`
- Responsive design using Tailwind utilities
- Layout components use computed `props` for dynamic CSS classes
- Ensure full class names available for dynamically applied utilities

## Performance

- Minimize client-side JavaScript
- Use client directives judiciously (but required for complex interactive elements with Tailwind v4)
- Leverage Astro's static generation
- Optimize images and assets
- Use pLimit with concurrency of 40+ for performance, 4-10 only for debugging

## Testing

Run tests with `pnpm test` using Vitest. The project uses:

- Global test utilities (describe, expect, etc.)
- TypeScript support in tests
- Vite configuration for testing
