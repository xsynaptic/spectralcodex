export const atlasFlagStorageKey = 'scx-atlas';
export const atlasPaneStorageKey = 'scx-atlas-pane-width';

export const atlasPersistName = 'atlas-map';

// Requested pane width in pixels; atlas.css clamps it into `--atlas-pane-width`
export const atlasPaneSizeProperty = '--atlas-pane-size';

// The island takes it as a build-time prop; atlas.css writes the same step as `theme(--breakpoint-lg)`
export const atlasPaneMediaQuery = '(width >= 64rem)';
