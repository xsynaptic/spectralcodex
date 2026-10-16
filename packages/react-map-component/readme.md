# react-map-component

The map island of Spectral Codex. It draws the site's Locations on a [react-map-gl](https://visgl.github.io/react-map-gl/) map over [Protomaps](https://protomaps.com/) basemap tiles, with clustering, status colours, Division masks and popups.

## Data

Each map fetches its dataset's directory from `/api/map/`, a compressed JSON payload written at build time by `@spectralcodex/map-codec`, and picks out its own rows using the rule the page gives it. Popup details arrive separately, in Chunks fetched when a Point is opened. Every payload URL carries a version hash, so the browser caches it across pages and a new build replaces it.

## State

Props are fixed at mount. Everything that changes afterwards (the view, Scope, Targets, selection, hover, filters and overlays) lives in one zustand store, and fetched data lives in react-query.

## Host contract

A host page drives a persisted map through the document rather than through props. The page's view (its Targets and an optional Scope) sits in a JSON attribute on the root element and is read again on `map:sync`. Layout facts arrive as custom properties on the shell, and the site's mode attribute switches dark mode. The map reports back with DOM events: `map:open` asks the host to open a page, `map:control` reports a press on a host control, and `map:track` carries analytics. All of these names are exported from `./constants`.

## Exports

- `.`: `ReactMapComponent` and its prop types
- `./constants`: event names, attributes, properties and class names shared with the host and the e2e suite
- `./track`: `trackMap`, for a host that reports its own map events
- `./styles/map-component.css`
