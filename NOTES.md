# Notes

## MDX Configuration

- `tsconfig` should also specify the remark plugin toolchain Astro uses (and the user may modify) to lint Markdown and MDX files
- ESLint should be used to lint and format MDX files; Prettier support for MDX is not comprehensive and errors will be introduced when using it as the MDX formatter

## Image Assets

Keep original image assets in the media folder specified in `.env`. High-quality JPG or lossless PNG format images at 2400+ pixels on the long edge are recommended. Current standard is mostly based on 3,600 pixel JPGs saved at maximum quality in Lightroom. Be sure to clean unreferenced original images out of your builds; they take up a lot of space without providing any benefit!

## Metadata Improvements

In cases where you'd like to find properties _not_ present in frontmatter, run this from the `content` folder (exchanging "rating:" for whatever you want to find):

```sh
find . -name "*.mdx" -print0 | xargs -0 grep -L "rating:" | sort
```

## Build Profiling

This worked pretty well to debug some major issues with `getCollection` calls:

```sh
npx 0x -- node ./node_modules/astro/astro.js build
```

## Map Icons

Experimental: This site uses custom map icons. To regenerate icons run `pnpm export-map-icons`. This requires [spreet](https://github.com/flother/spreet) to be installed separately (and globally).

## Bugs

- API endpoints are returning scrambled CJK characters in production; the issue might be at the level of Cloudflare, as Astro is generating correct data

## Todo

- new content collection for commercial establishments (restaurants, cafes, etc.)... gastronomy?
- [remark-oembed](https://github.com/sergioramos/remark-oembed), [mdx-embed](https://mdx-embed.netlify.app/), or [astro embed](https://astro-embed.netlify.app/)
- images: [unpic](https://unpic.pics/), if we ever use a CDN that is
- images: explore new responsive images features
- multiple featured images for post-like content
- carousel buttons (or some other hint to indicate that some images can be swiped)
- better pagination (_e.g._ [here](https://github.com/philnash/astro-pagination))
- sources styling

### Maps

- [build fonts](https://maplibre.org/font-maker/) and sprites for local hosting; see [here](https://github.com/protomaps/basemaps-assets) for an example
- protomaps self-hosted setup
- option to convert GeoJSON to something Google Maps (or Google My Maps) can consume, ultimately so anyone can import a map with at least some of the relevant info
- for locations with a distance query draw a circle with the radius of the query and shade everything outside of it
- [Overture Maps](https://docs.overturemaps.org/) data, especially boundaries
- persistent storage for stateful data (per map)
- multiple points per location entry
- different geography support (in progress 2024Q4)

### SEO

- [favicon generation](https://kremalicious.com/favicon-generation-with-astro/); see also [astro-favicons](https://github.com/ACP-CODE/astro-favicons) and [astro-webmanifest](https://github.com/alextim/astro-lib/tree/main/packages/astro-webmanifest)
- add a more accurate `lastmod` to sitemap

### Search

- search: [pagefind](https://pagefind.app/) does not yet explicitly export [types](https://github.com/CloudCannon/pagefind/blob/production-docs/pagefind_web_js/types/index.d.ts)
- integrating it is a bit of a hack unless we go with the pre-baked [astro-pagefind](https://github.com/shishkin/astro-pagefind), but I think we want more control over search than what this integration allows
- [this vite plugin](https://github.com/Hugos68/vite-plugin-pagefind) simplifies custom integrations but it's an obscure package with no discernable future
- there are many tutorials but [this one](https://syntackle.com/blog/pagefind-search-in-astro-site/) goes into a little more depth about a custom setup; [this one](https://chrispennington.blog/blog/pagefind-static-search-for-astro-sites/) is also a bit helpful

### Extras

- basic analytics with [umami](https://github.com/umami-software/umami); see also [awesome analytics](https://github.com/newTendermint/awesome-analytics)
- [astro-i18next](https://github.com/yassinedoghri/astro-i18next) or some other i18n solution; currently this project only sketches things out
- link-rot prevention: scan all official links in content to identify sources that have disappeared from the web
- auto-archiver: maintain a backup copy of all official links and swap that in by including the archived webpage in the public folder
- reading stats/word count (without it being a frontmatter thing, the performance issues are too much)
- slideshow for the homepage based on content metadata
- multiple featured images (_e.g._ use arrays to define them and rotate every build)
- style RSS and sitemap XML; see [here](https://darekkay.com/blog/rss-styling/) for an intro
- fine-tune [prefetch](https://docs.astro.build/en/guides/prefetch/#migrating-from-astrojsprefetch); currently it is on for all links, which may cause some performance issues
- get into the indie web
- image entry backlinks

## Done

- utility function to fetch resolved color tokens from Tailwind
- content excerpts
- fonts
- dedupe coordinates, title, etc. in locations
- redirects (handled via Nginx)
- [astro-seo](https://github.com/jonasmerlin/astro-seo) or [@astrolib/seo](https://github.com/onwidget/astrolib/tree/main/packages/seo)
- remove unused fonts
- sources (a basic implementation)
- multiple featured images for term-like content
- reading progress bar; see [here](https://dev.to/gaberomualdo/create-a-reading-scroll-progress-bar-for-your-blog-in-javascript-and-css-1jmc), [here](https://web.dev/articles/building/a-loading-bar-component), or [here](https://github.com/florian-lefebvre/astro-loading-indicator/blob/main/package/README.md) for some inspiration
- backlinks in content
- combine links and sources
- improve understanding of conditions under which images are completely regenerated; the hash for individual images will cause everything to change when we relocate the repo; another hash is generated for overall image service configuration and file location
- [contribute](https://opencollective.com/astrodotbuild)
- fix reading progress bar so it starts at the top of the page (well, good enough)
- center on the current location when displaying nearby points on the map