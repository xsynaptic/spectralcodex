import { atlasPage } from '#lib/atlas/atlas-constants.ts';

export interface AtlasLayoutState {
	hasFlag: boolean;
	isPaneMatch: boolean;
	page: string | undefined;
}

export function isAtlasMapShown({ hasFlag, page }: Pick<AtlasLayoutState, 'hasFlag' | 'page'>) {
	return hasFlag && (page === atlasPage.map || page === atlasPage.pane);
}

export function getAtlasLayout({ hasFlag, isPaneMatch, page }: AtlasLayoutState) {
	if (!isAtlasMapShown({ hasFlag, page })) return 'regular';
	if (page === atlasPage.map) return 'map';

	return isPaneMatch ? 'split' : 'sheet';
}
