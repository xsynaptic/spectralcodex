export const atlasFlagStorageKey = 'scx-atlas';
export const atlasPaneStorageKey = 'scx-atlas-pane-width';
export const atlasReturnStorageKey = 'scx-atlas-return';
export const atlasSheetRestStorageKey = 'scx-atlas-sheet-rest';

export const atlasLinkParam = 'atlas';

export const atlasPersistName = 'atlas-map';
export const atlasShellSelector = `[data-astro-transition-persist="${atlasPersistName}"]`;

export const atlasRootId = 'atlas-root';

export const atlasPaneSelector = '.main-pane';
export const atlasPaneMainSelector = `${atlasPaneSelector} > main`;
export const atlasSheetHandleSelector = '.atlas-sheet-handle';
export const atlasInlineMapSelector = '.atlas-inline-map';
export const atlasSheetStartSelector = `${atlasPaneMainSelector} [data-atlas-sheet-start]`;

export const atlasFlagAttribute = 'data-atlas';
export const atlasPageAttribute = 'data-atlas-page';
export const atlasFromAttribute = 'data-atlas-from';

export const atlasPage = { map: 'map', pane: 'pane' } as const;

// Requested pane width in pixels; atlas.css clamps it into `--atlas-pane-width`
export const atlasPaneSizeProperty = '--atlas-pane-size';

export const atlasPaneMinProperty = '--atlas-pane-min';
export const atlasMapMinProperty = '--atlas-map-min';
export const atlasPaneDefaultProperty = '--atlas-pane-default';

export const atlasPaneLayoutProperty = '--atlas-pane-layout';
export const atlasSheetHalfProperty = '--atlas-sheet-half';

export const atlasSheetFoldProperty = '--atlas-sheet-fold';

export const atlasSheetAttribute = 'data-atlas-sheet';
export const atlasSheetRest = { half: 'half', lowered: 'lowered', raised: 'raised' } as const;

export const atlasSheetHalfLineProperty = '--atlas-sheet-half-line';
export const atlasSheetLoweredLineProperty = '--atlas-sheet-lowered-line';
export const atlasSheetGrabbingAttribute = 'data-grabbing';
