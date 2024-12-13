# Astro Image Loader

This is a draft version of an image loader integration for Astro. Currently it works well enough for personal use, but the watcher requires improvement before any public release.

The concept: treat individual images as content! Images are loaded and a callback function allows for file operations to collect metadata that is then validated against a user-defined schema.

Currently I generate two kinds of image metadata with this loader:

1. Low-quality image placeholders (LQIP) encoded in data URIs and stored with the collection, which makes outputting the markup a breeze.
2. EXIF data read by the excellent [exiftool-vendored](https://github.com/photostructure/exiftool-vendored.js) library; this includes fields like image title, camera model, ISO, etc.

That said, the scope of this package is limited to providing the scaffolding for this kind of use case; the actual implementation of placeholders and EXIF data reading is handled in the callback function in the main Astro project.
