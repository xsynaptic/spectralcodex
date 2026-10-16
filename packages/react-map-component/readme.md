# react-map-component

The map island of Spectral Codex: the site's Locations on a [react-map-gl](https://visgl.github.io/react-map-gl/) map over [Protomaps](https://protomaps.com/) basemap tiles. Rules for working on it live in `AGENTS.md`.

## Data

Each map fetches its dataset's directory from `/api/map/`, written at build time by `@spectralcodex/map-codec`, and picks out its own rows with the rule the page gives it. Popup details arrive separately, in Chunks fetched when a Point opens. Every payload URL carries a version hash, so the browser caches one copy across pages and a new build replaces it.

## Theming

A host themes the map by remapping the `--map-*` inputs (colour scale, radii, fonts, images) on `[data-map-root]`, as `src/styles/main/components/map.css` does; the package derives each mode's role tokens from them. Canvas layer colours are set in code and do not follow them.
