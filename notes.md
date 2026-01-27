# Notes

## Debug

### Build Profiling

This profiling command worked pretty well to debug some major issues with `getCollection` calls:

```sh
npx 0x -- node ./node_modules/astro/astro.js build
```

## Things To Do

- new content collection for commercial establishments (restaurants, cafes, etc.), maybe "gastronomy" or just "food and drink"?
- multiple featured images for post-like content
- carousel buttons (or some other hint to indicate that some images can be swiped); this feature is only partly complete
- better pagination (_e.g._ [here](https://github.com/philnash/astro-pagination))

### Maps

- [build fonts](https://maplibre.org/font-maker/) and sprites for local hosting; see [here](https://github.com/protomaps/basemaps-assets) for an example
- protomaps self-hosted setup
- option to convert GeoJSON to something Google Maps (or Google My Maps) can consume, ultimately so anyone can import a map with at least some of the relevant info
- for locations with a distance query draw a circle with the radius of the query and shade everything outside of it
- different geography support (in progress 2024Q4)
- filter for themes or categories
- ruler tool
- [fuzzy search](https://github.com/m31coding/fuzzy-search) in the mapping application itself

### SEO

- [favicon generation](https://kremalicious.com/favicon-generation-with-astro/); see also [astro-favicons](https://github.com/ACP-CODE/astro-favicons) and [astro-webmanifest](https://github.com/alextim/astro-lib/tree/main/packages/astro-webmanifest)
- add a more accurate `lastmod` to sitemap

### Extras

- [astro-i18next](https://github.com/yassinedoghri/astro-i18next) or some other i18n solution; currently this project only sketches things out
- link-rot prevention: scan all official links in content to identify sources that have disappeared from the web
- auto-archiver: maintain a backup copy of all official links and swap that in by including the archived webpage in the public folder
- fine-tune [prefetch](https://docs.astro.build/en/guides/prefetch/#migrating-from-astrojsprefetch); currently it is on for all links, which may cause some performance issues

## Done

- redirects (handled via Nginx)
- [astro-seo](https://github.com/jonasmerlin/astro-seo) or [@astrolib/seo](https://github.com/onwidget/astrolib/tree/main/packages/seo)
- sources (a basic implementation)
- multiple featured images for term-like content
- combine links and sources
- improve understanding of conditions under which images are completely regenerated; the hash for individual images will cause everything to change when we relocate the repo; another hash is generated for overall image service configuration and file location
- [contribute to Astro](https://opencollective.com/astrodotbuild)
- center on the current location when displaying nearby points on the map
- reading stats/word count (without it being a frontmatter thing, the performance issues are too much)
- slideshow for the homepage based on content metadata
- multiple featured images (_e.g._ use arrays to define them and rotate every build)
- better formatting for sources; currently the mix of languages leads to some awkward output
- basic analytics with [umami](https://github.com/umami-software/umami); see also [awesome analytics](https://github.com/newTendermint/awesome-analytics)
- multiple points per location entry (in progress 2025Q2)
