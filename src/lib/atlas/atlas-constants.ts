export const atlasFlagStorageKey = 'scx-atlas';
export const atlasPaneStorageKey = 'scx-atlas-pane-width';
export const atlasReturnStorageKey = 'scx-atlas-return';

export const atlasPersistName = 'atlas-map';

// On the root element, so fullscreen from the atlas map takes the pane with it
export const atlasRootId = 'atlas-root';

// Values of `data-atlas-page` on the root; atlas.css writes the same two
export const atlasPage = { map: 'map', pane: 'pane' } as const;

// Requested pane width in pixels; atlas.css clamps it into `--atlas-pane-width`
export const atlasPaneSizeProperty = '--atlas-pane-size';

// The island takes it as a build-time prop; atlas.css writes the same step as `theme(--breakpoint-lg)`
export const atlasPaneMediaQuery = '(width >= 64rem)';
