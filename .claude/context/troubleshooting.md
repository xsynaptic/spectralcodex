# Common Issues

## Memory Issues

- Use `NODE_OPTIONS=--max-old-space-size=8192` for builds failing because of memory issues
- Project is content-heavy with 10+ minute build times - consider memory usage when adding content processing

## Content Updates

- Run `pnpm astro sync --force` after schema changes
- Restart dev server after content collection changes

## Development Server

- **First request to dev server is slow** - The initial request after starting `pnpm dev` may take time to respond as the content metadata index will be rebuilt
- Subsequent startups are faster unless schema or collection configuration changes
