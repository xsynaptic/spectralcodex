export const atlasFlagStorageKey = 'scx-atlas';
export const atlasPaneStorageKey = 'scx-atlas-pane-width';
export const atlasReturnStorageKey = 'scx-atlas-return';
export const atlasSheetRestStorageKey = 'scx-atlas-sheet-rest';

export const atlasLinkParam = 'atlas';

export const atlasPersistName = 'atlas-map';

export const atlasRootId = 'atlas-root';

export const atlasPaneSelector = '.main-pane';
export const atlasPaneMainSelector = `${atlasPaneSelector} > main`;
export const atlasSheetHandleSelector = '.atlas-sheet-handle';
export const atlasInlineMapSelector = '.atlas-inline-map';
export const atlasSheetStartSelector = `${atlasPaneMainSelector} [data-atlas-sheet-start]`;

// Values of `data-atlas-page` on the root; atlas.css writes the same two
export const atlasPage = { map: 'map', pane: 'pane' } as const;

// Requested pane width in pixels; atlas.css clamps it into `--atlas-pane-width`
export const atlasPaneSizeProperty = '--atlas-pane-size';

// atlas.css writes the same `64rem` in its own queries
export const atlasPaneMediaQuery = '(width >= 64rem)';

export const atlasSheetFoldProperty = '--atlas-sheet-fold';

export const atlasSheetAttribute = 'data-atlas-sheet';
export const atlasSheetRest = { down: 'down', half: 'half', raised: 'raised' } as const;

// atlas.css writes the same `30rem` where it sets the map's inset
export const atlasSheetHalfMediaQuery = '(height >= 30rem)';

export const atlasSheetSplitProperty = '--atlas-sheet-split';
export const atlasSheetRestProperty = '--atlas-sheet-rest';
export const atlasSheetGrabbingAttribute = 'data-grabbing';
