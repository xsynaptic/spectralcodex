# Astro Image Loader

A content layer loader for Astro that treats individual images as content entries. Images are discovered by glob and passed to a `dataHandler` callback for metadata extraction (EXIF, dimensions, placeholders); the output is validated against the collection schema and cached.

The package owns discovery, digest-based incremental sync, watch-mode updates, and caching. Metadata extraction belongs to the consumer: see `src/lib/collections/images/images-config.ts` in the main project for the reference implementation (EXIF via [exiftool-vendored](https://github.com/photostructure/exiftool-vendored.js), dimensions via Sharp, SQLite as a custom cache backend).

## Usage

`defineImageCollection(options)` returns a `{ loader, schema }` pair ready for `defineCollection`. Pass a `schema` matching your `dataHandler` output; the default `ImageLoaderBaseSchema` (`src`, `modifiedTime`) covers loader-only use. The bare `imageLoader(options)` factory is also exported.

## Options

- `base`: directory to resolve images from, relative to the project root
- `pattern`: glob pattern(s) relative to `base`; defaults to all Astro-supported raster formats
- `concurrency`: how many images are processed at once
- `debounceMs`: debounce window for batching watch-mode file events
- `invalidationKey`: serializable key folded into every entry digest; change it to force regeneration (derive it from your schema, including any env-derived values your dataHandler output embeds)
- `cache`: storage for dataHandler output, surviving Astro data store wipes; defaults to a JSONL file under Astro's `cacheDir`. Pass a `{ get, set, prune }` implementation to bring your own storage, the exported `createJsonlCache({ filePath })` to relocate the default, or `false` to disable
- `generateId`: entry ID factory, defaults to the relative file path
- `dataHandler`: metadata extraction callback; its output is merged into entry data, cached, and validated by the collection schema
- `beforeLoad` / `afterLoad`: batch lifecycle hooks (e.g. spawn and end an ExifTool instance)

## Notes

- An entry re-processes only when `{ id, filePath, mtime, base, invalidationKey }` changes; after a data store wipe, cached dataHandler output repopulates entries without re-extraction
- Dead cache keys are pruned after every full load
- Watch mode batches file events through a debounced, serialized queue; lifecycle hooks bracket each batch exactly once
- Local images only; remote images are out of scope
