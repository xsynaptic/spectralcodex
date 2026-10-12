import { atlasPaneMediaQuery } from '#lib/atlas/atlas-constants.ts';
import { getAtlasLayout } from '#lib/atlas/atlas-layout-factory.ts';

export function readAtlasLayout(root: HTMLElement = document.documentElement) {
	return getAtlasLayout({
		hasFlag: Object.hasOwn(root.dataset, 'atlas'),
		isPaneMatch: matchMedia(atlasPaneMediaQuery).matches,
		page: root.dataset.atlasPage,
	});
}
