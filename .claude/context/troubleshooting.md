# Common Issues

## Memory Issues

- Use `NODE_OPTIONS=--max-old-space-size=8192` for builds failing because of memory issues

## Content Updates

- Run `pnpm astro sync --force` after schema changes
- Restart dev server after content collection changes
