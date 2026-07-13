# Astro Image Loader

A content-layer loader for Astro that treats individual images as content entries. Images are discovered by glob pattern and a callback allows file operations (EXIF reading, placeholder generation, dimension probing) to collect metadata, which is then validated against a user-defined schema.

The scope of this package is limited to scaffolding: discovery, digest-based incremental sync, watch-mode updates, and cache-invalidation seams. Actual metadata extraction is handled by the consumer via the `dataHandler` callback; see `src/lib/collections/images/images-config.ts` in the main project for the reference implementation (EXIF via [exiftool-vendored](https://github.com/photostructure/exiftool-vendored.js), dimensions via Sharp, with a durable SQLite cache that survives Astro data store wipes).

## Usage

`defineImageCollection(options)` returns a `{ loader, schema }` pair ready for `defineCollection`. Pass a `schema` matching your `dataHandler` output; without one, the exported `ImageLoaderBaseSchema` (`src`, `modifiedTime`) covers loader-only use. The bare `imageLoader(options)` factory is also exported.

## Options

- `base`: directory to resolve images from, relative to the project root
- `pattern`: glob pattern(s) relative to `base`; defaults to all Astro-supported image formats, ignoring underscore-prefixed filenames
- `concurrency`: how many images are processed at once
- `debounceMs`: debounce window for batching watch-mode file events
- `invalidationKey`: serializable key folded into every entry digest; change it to force regeneration (e.g. derive it from your collection schema)
- `generateId`: entry ID factory, defaults to the relative file path
- `dataHandler`: metadata extraction callback; its output is merged into entry data and validated by the collection schema
- `beforeLoad` / `afterLoad`: batch lifecycle hooks (e.g. spawn and end an ExifTool instance); full loads pass `afterLoad` every live relative path, useful for pruning external caches

## Notes

- Entries skip re-processing when `{ id, filePath, mtime, base, invalidationKey }` is unchanged; Astro's own data store persistence does the rest
- Watch mode batches file events through a debounced, serialized queue so lifecycle hooks bracket each batch exactly once
- Local images only; remote images are out of scope
