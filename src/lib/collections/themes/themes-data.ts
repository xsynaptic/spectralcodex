import { getCollection } from 'astro:content';

import { createCollectionData } from '#lib/utils/collections.ts';

export const getThemesCollection = createCollectionData({
	collection: 'themes',
	label: 'Themes',
	async mutate(entries) {
		const locations = await getCollection('locations');
		const posts = await getCollection('posts');

		const locationsByThemeMap = new Map<string, Array<string>>();

		for (const location of locations) {
			const locationThemes = location.data.themes ?? [];

			for (const { id: themeId } of locationThemes) {
				if (!locationsByThemeMap.has(themeId)) locationsByThemeMap.set(themeId, []);
				locationsByThemeMap.get(themeId)!.push(location.id);
			}
		}

		const postsByThemeMap = new Map<string, Array<string>>();

		for (const post of posts) {
			const postThemes = post.data.themes ?? [];

			for (const { id: themeId } of postThemes) {
				if (!postsByThemeMap.has(themeId)) postsByThemeMap.set(themeId, []);
				postsByThemeMap.get(themeId)!.push(post.id);
			}
		}

		for (const entry of entries) {
			entry.data._locations = locationsByThemeMap.get(entry.id) ?? [];
			entry.data._locationCount = entry.data._locations.length;
			entry.data._posts = postsByThemeMap.get(entry.id) ?? [];
			entry.data._postCount = entry.data._posts.length;
		}
	},
});
