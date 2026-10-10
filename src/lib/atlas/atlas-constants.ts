export const atlasFlagStorageKey = 'scx-atlas';
export const atlasPaneStorageKey = 'scx-atlas-pane-width';

export const atlasPersistName = 'atlas-map';

// Requested pane width in pixels; atlas.css clamps it into `--atlas-pane-width`
export const atlasPaneSizeProperty = '--atlas-pane-size';

// Mirrors the breakpoint in atlas.css
export const atlasPaneMediaQuery = '(width >= 64rem)';

export const atlasPaneSizeDefault = '45rem';

export const atlasHeroSelector = 'img[data-hero-image]';

export const atlasHeroSizesTemplate = `${atlasPaneMediaQuery} clamp(40rem, [size], 100vw - 20rem), 100vw`;

// Dispatched on every page load and flag change; the map also takes it as its cue to re-measure
export const atlasSyncEventName = 'atlas:sync';
export const atlasExitEventName = 'atlas:exit';
export const atlasNavigateEventName = 'atlas:navigate';
