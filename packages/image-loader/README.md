# Astro Image Loader

This is a draft version of an image loader integration for Astro. Currently it works well enough for personal use, but the watcher requires improvement before any public release.

The idea, in short: treat individual images as content items and allow for a callback function specified in content collection definitions to fill out user-defined schemas with image metadata.

For this project I use this for two purposes:

1. Generating and caching the data URI used to display image placeholders, part of the LQIP technique implemented on the main site.
2. Extracting EXIF data from images to populate fields with some basic info like image title, camera model, ISO, etc.
