import type { CollectionEntry } from 'astro:content';

import { createCollectionData, getRawCollection } from '#lib/utils/collections.ts';

// Direct membership only; unlike regions, themes do not roll up their children
function mapByTheme(
	items: Array<CollectionEntry<'locations' | 'notes' | 'posts'>>,
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
		const notes = await getRawCollection('notes');

		const locationsByThemeMap = mapByTheme(locations);
		const postsByThemeMap = mapByTheme(posts);
		const notesByThemeMap = mapByTheme(notes);

		for (const entry of entries) {
			entry.data._locations = locationsByThemeMap.get(entry.id) ?? [];
			entry.data._locationCount = entry.data._locations.length;
			entry.data._posts = postsByThemeMap.get(entry.id) ?? [];
			entry.data._postCount = entry.data._posts.length;
			entry.data._notes = notesByThemeMap.get(entry.id) ?? [];
			entry.data._noteCount = entry.data._notes.length;
			entry.data._entryCount =
				entry.data._locationCount + entry.data._postCount + entry.data._noteCount;
		}
	},
});
