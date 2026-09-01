// Minimum dimensions recommended by Facebook (1.91:1 aspect ratio)
export const openGraphImageWidth = 1200;
export const openGraphImageHeight = 630;
export const openGraphImageFormat = 'jpg';

// Destination path for Open Graph images
export const openGraphBasePath = 'og';

// Local build output directory for generated Open Graph images
export const openGraphOutputPath = '.cache/og-image';

// Keyv namespace (and JSON filename stem) for the Open Graph generation cache
export const openGraphCacheNamespace = 'og-image-cache';

// Astro's cache directory, set explicitly so build-time scripts read the data store where Astro writes it
export const astroCacheDir = './node_modules/.astro';

// Written by the sitemap-lastmod deploy step, read back when the Astro config loads
export const sitemapLastmodPath = '.cache/sitemap-lastmod.json';
