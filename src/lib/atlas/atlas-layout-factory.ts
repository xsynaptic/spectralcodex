import {
	atlasFlagAttribute,
	atlasPage,
	atlasPageAttribute,
	atlasSheetRest,
} from '#lib/atlas/atlas-constants.ts';

export type AtlasSheetRest = (typeof atlasSheetRest)[keyof typeof atlasSheetRest];

export type AtlasScreen =
	{ layout: 'map' | 'regular' | 'split' } | { layout: 'sheet'; rest: AtlasSheetRest };

export type AtlasPaneLayout = 'sheet' | 'split';

export interface AtlasLayoutState {
	hasFlag: boolean;
	page: string | undefined;
	paneLayout: AtlasPaneLayout;
}

export interface AtlasOpenInput {
	pathname: string;
	screen: AtlasScreen;
	url: string;
}

export function readAtlasFlags(root: HTMLElement) {
	return {
		hasFlag: root.hasAttribute(atlasFlagAttribute),
		page: root.getAttribute(atlasPageAttribute) ?? undefined,
	};
}

export function isAtlasMapShown({ hasFlag, page }: Pick<AtlasLayoutState, 'hasFlag' | 'page'>) {
	return hasFlag && (page === atlasPage.map || page === atlasPage.pane);
}

export function getAtlasLayout({ hasFlag, page, paneLayout }: AtlasLayoutState) {
	if (!isAtlasMapShown({ hasFlag, page })) return 'regular';
	if (page === atlasPage.map) return 'map';

	return paneLayout;
}

export function getAtlasOpenAction({ pathname, screen, url }: AtlasOpenInput) {
	if (url !== pathname) return { type: 'navigate', url } as const;

	const rest = screen.layout === 'sheet' ? screen.rest : undefined;

	if (rest === atlasSheetRest.lowered) return { type: 'raise' } as const;
	if (rest === atlasSheetRest.half) return { type: 'start' } as const;

	return { type: 'top' } as const;
}
