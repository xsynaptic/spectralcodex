# astro-build-logger

Astro integration that appends a JSON Lines (JSONL) record after each build. One JSON object per line, written to `astro-build.jsonl` at the project root.

## Schema

```ts
{
  timestamp: string;        // ISO 8601 UTC, e.g. "2026-05-05T07:50:21.000Z"
  durationSeconds: number;  // build duration in seconds
  pageCount: number;        // number of routes built
  outputBytes: number;      // total size of output dir
  astroVersion: string;     // e.g. "6.2.2"
  nodeVersion: string;      // e.g. "22.9.0"
  summary: string;          // human-readable e.g. "8m 37s (1234 pages, 245 MB)"
  notes?: string;           // manual annotation; never auto-populated
}
```
