import { atlasPage } from '#lib/atlas/atlas-constants.ts';

export interface AtlasLayoutState {
	hasFlag: boolean;
	isPaneMatch: boolean;
	page: string | undefined;
}

// `/atlas` shows the map at every width; beside a pane it shows only where the pane query matches
// On any other page a persisted shell stays hidden
export function getAtlasLayout({ hasFlag, isPaneMatch, page }: AtlasLayoutState) {
	if (!hasFlag) return 'regular';
	if (page === atlasPage.map) return 'map';
	if (isPaneMatch && page === atlasPage.pane) return 'split';

	return 'regular';
}
