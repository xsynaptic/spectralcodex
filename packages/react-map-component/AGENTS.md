# Map package

The map island and the contract it keeps with its host, the Atlas in `src/lib/atlas`.

## Layers

Imports flow one way, UI to state to base, along the zones in `.fallowrc.jsonc` that `pnpm check` enforces. When an import breaks a zone, move the code down to where it belongs rather than widening the zone.

## State

- Props are read once at mount. A persisted island never receives new ones, so anything that changes afterwards lives in the store or arrives from the host.
- No effect derives store state from other store state. Host changes arrive through `map:sync`, and user actions through their handlers.
- Every map fetches its dataset's directory from `/api/map/` rather than receiving rows inline, so the HTTP cache shares one copy across pages.

## Host contract

- The map knows nothing about the page around it: it reads no `location` and uses no viewport media queries (it measures itself with `@container map`). The host decides anything that depends on layout.
- The host talks to the map through the document (the view attribute with `map:sync`, custom properties on the shell, the site's mode attribute), and the map answers with `map:open`, `map:control` and `map:track` events.
- Every click and search pick goes through `resolveClick` in `host/host-click-factory.ts`. The host only routes the URL it gets back.
- Links that navigate within the site carry no `data-umami-event`, because umami turns those clicks into full page loads, which unload the Atlas map.

## Styling

- The colour scale in `tokens.css` holds only the steps a role reads, and the host remaps those same steps in `src/styles/main/components/map.css`, so add or drop a step in both.
- Rules read colour through a role token, never a scale step; a non-colour dark swap uses `[data-map-mode='dark']`.
- MapLibre's CSS sits in `layer(maplibre)`, under the unlayered package rules, so an override needs no extra specificity. That win also cancels MapLibre's forced-colours rules, so restate an overridden property in the forced-colours block that closes its area's stylesheet, where every floating surface takes the `ButtonText` outline.
- Status colours on the canvas and filter swatches come from `LocationStatusRecords`, not the tokens.

## Tests

`tests/e2e/atlas.spec.ts` covers what a reader can see: real links, controls and history. Sleeps, pixel measurements and synthetic events pass while the real path breaks, so avoid them. Pure rules get unit tests beside their `*-factory.ts`.
