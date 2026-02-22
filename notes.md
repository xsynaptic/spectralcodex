# Notes

## To Do

- new content collection for commercial establishments (restaurants, cafes, etc.), maybe "gastronomy" or just "food and drink"?
- multiple featured images for post-like content
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

### Extras

- [astro-i18next](https://github.com/yassinedoghri/astro-i18next) or some other i18n solution; currently this project only sketches things out
- link-rot prevention: scan all official links in content to identify sources that have disappeared from the web
- auto-archiver: maintain a backup copy of all official links and swap that in by including the archived webpage in the public folder
