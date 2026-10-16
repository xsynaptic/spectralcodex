# Map package

The map island and the contract it keeps with its host, the Atlas in `src/lib/atlas`.

## Layers

Imports flow one way. The UI directories (`canvas`, `controls`, `popup`, `search`, `source`, `targets`) import from the state directories (`data`, `host`, `store`), which import from `lib`, `constants.ts`, `types.ts` and `track.ts`. Fallow enforces this in `pnpm check`; when an import breaks it, move the code down to where it belongs rather than widening a zone.

## State

- Props are read once at mount. A persisted island never receives new ones, so anything that changes afterwards lives in the store or arrives from the host.
- A store selector returns a stored value or a primitive. A selector that builds a new object re-renders every subscriber.
- No effect derives store state from other store state. Host changes arrive through `map:sync`, and user actions through their handlers.
- Every map fetches its dataset's directory from `/api/map/` rather than receiving rows inline, so the HTTP cache shares one copy across pages.

## Host contract

- The map knows nothing about the page around it: it reads no `location` and uses no viewport media queries (it measures itself with `@container map`). The host decides anything that depends on layout, and the Atlas layout lives in CSS.
- The host talks to the map through the document (the view attribute with `map:sync`, custom properties on the shell, the site's mode attribute), and the map answers with `map:open`, `map:control` and `map:track` events. The names are exported from `constants.ts` for scripts and e2e tests; stylesheets write them out.
- Every click and search pick goes through `resolveClick` in `host/host-click-factory.ts`. The host only routes the URL it gets back.
- Links that navigate within the site carry no `data-umami-event`, because umami turns those clicks into full page loads, which unload the Atlas map.

## Tests

`tests/e2e/atlas.spec.ts` covers what a reader can see: real links, controls and history. Sleeps, pixel measurements and synthetic events pass while the real path breaks, so avoid them. Pure rules get unit tests beside their `*-factory.ts`.
