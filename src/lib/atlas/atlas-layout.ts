import type { AtlasScreen, AtlasSheetRest } from '#lib/atlas/atlas-layout-factory.ts';

import {
	atlasPaneMediaQuery,
	atlasSheetAttribute,
	atlasSheetRest,
} from '#lib/atlas/atlas-constants.ts';
import { getAtlasLayout } from '#lib/atlas/atlas-layout-factory.ts';

export function readAtlasLayout(root: HTMLElement = document.documentElement) {
	return getAtlasLayout({
		hasFlag: Object.hasOwn(root.dataset, 'atlas'),
		isPaneMatch: matchMedia(atlasPaneMediaQuery).matches,
		page: root.dataset.atlasPage,
	});
}

export function readSheetRest(): AtlasSheetRest {
	const value = document.documentElement.getAttribute(atlasSheetAttribute);

	if (value === atlasSheetRest.down || value === atlasSheetRest.half) return value;

	return atlasSheetRest.raised;
}

export function readAtlasScreen(): AtlasScreen {
	const layout = readAtlasLayout();

	return layout === 'sheet' ? { layout, rest: readSheetRest() } : { layout };
}
