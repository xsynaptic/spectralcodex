# Map package

The map island and the contract it keeps with its host, the Atlas in `src/lib/atlas`.

## Layers

Imports flow one way, UI to state to base, along the zones in `.fallowrc.jsonc` that `pnpm check` enforces. When an import breaks a zone, move the code down to where it belongs rather than widening the zone.

Location knowledge (Status and its records) enters the package only through the filter module, `data/data-filter.ts`, which owns the Map Filter, and the canvas palette, `lib/canvas-palette.ts`. The `map-domain` zone catches direct and re-exported imports, though tests may import Status freely; a Status value wrapped inside another package slips past it, so watch for that in review.

## State

- Props are read once at mount. The Atlas persists the island's wrapper rather than the island, so Astro never hands it new props; anything that changes afterwards lives in the store or arrives from the host.
- No effect derives store state from other store state. Host changes arrive through `map:sync`, and user actions through their handlers.
- A `useSyncExternalStore` snapshot runs on every render, so a layout read there (`clientWidth`, `getComputedStyle`) forces style and layout on each hover render; read layout in the handler or effect that needs it.
- Every map fetches its dataset's one whole directory file from `/api/map/`, so the HTTP cache shares one copy across pages. Partitions scatter a Theme across many Regions, and inlined rows help only one-page visits.
- Every payload but a Division mask shares one version hash, since Locations change on most edit days.
- Lines and pulse rings place Points through `lib/clusters-factory.ts`, a main-thread copy of MapLibre's cluster index. It copies three facts from MapLibre's `geojson_source.ts` (radius ×16 into tile units, extent 8192, clustering at `floor(zoom)`); recheck them on a MapLibre major upgrade.

## Host contract

- The map knows nothing about the page around it: it reads no `location` and uses no viewport media queries (it measures itself with `@container map`). The host decides anything that depends on layout.
- The host talks to the map through the document (the view attribute with `map:sync`, custom properties on the shell, the site's mode attribute), and the map answers with `map:open`, `map:prefetch`, `map:control` and `map:track` events.
- Every click and search pick goes through `resolveClick` in `host/host-click-factory.ts`. The host only routes the URL it gets back.
- The pulse ring marks only the page being read; a selected Point shows as its enlarged symbol under the popup.
- The Sheet is a pane translated over the document, keeping its rest and the reader's scroll as two offsets; one built on the document's scroll failed on phones.
- Links that navigate within the site carry no `data-umami-event`, because umami turns those clicks into full page loads, which unload the Atlas map.

## Search

Map search extends its own matcher in `search/`. MiniSearch was measured: it ranked Themes over Locations (`tainan` is one edit from `taiwan`), built ten times slower, and lost exact highlight ranges.

## Styling

- The colour scale in `tokens.css` holds only the steps a role reads, and the host remaps those same steps in `src/styles/main/components/map.css`, so add or drop a step in both.
- Rules read colour through a role token, never a scale step; a non-colour dark swap uses `[data-map-mode='dark']`.
- MapLibre's CSS sits in `layer(maplibre)`, under the unlayered package rules, so an override needs no extra specificity. That win also cancels MapLibre's forced-colours rules, so restate an overridden property in the forced-colours block that closes its area's stylesheet, where every floating surface takes the `ButtonText` outline.
- Canvas colour goes through the role-named `lib/canvas-palette.ts`, since CSS can't reach the canvas. The filter swatches read it too, because they are the legend for the canvas dots. Neither reads the tokens.

## Tests

`tests/e2e/atlas.spec.ts` covers what a reader can see: real links, controls and history. Sleeps, pixel measurements and synthetic events pass while the real path breaks, so avoid them. Pure rules get unit tests beside their `*-factory.ts`.
