import type { CollectionEntry } from 'astro:content';

import {
	createCollectionData,
	createCollectionLookupByIds,
	getRawCollection,
} from '#lib/utils/collections.ts';
import { collectUnlistedLocationIds, populateContentCounts } from '#lib/utils/content-policy.ts';

// Direct membership only; unlike regions, themes do not roll up their children
function mapByTheme(
	items: Array<CollectionEntry<'locations' | 'posts'>>,
): Map<string, Array<string>> {
	const map = new Map<string, Array<string>>();

	for (const item of items) {
		const themes = item.data.themes ?? [];

		for (const { id: themeId } of themes) {
			if (!map.has(themeId)) map.set(themeId, []);
			map.get(themeId)!.push(item.id);
		}
	}

	return map;
}

export const getThemesCollection = createCollectionData({
	collection: 'themes',
	label: 'Themes',
	async mutate(entries) {
		const locations = await getRawCollection('locations');
		const posts = await getRawCollection('posts');

		const locationsByThemeMap = mapByTheme(locations);
		const postsByThemeMap = mapByTheme(posts);

		const unlistedLocationIds = collectUnlistedLocationIds(locations);

		for (const entry of entries) {
			entry.data._locations = locationsByThemeMap.get(entry.id) ?? [];
			entry.data._posts = postsByThemeMap.get(entry.id) ?? [];

			populateContentCounts(entry.data, {
				locations: entry.data._locations,
				posts: entry.data._posts,
				unlistedLocationIds,
			});
		}
	},
});

export const createThemesByIdsFunction = createCollectionLookupByIds('Themes', getThemesCollection);
