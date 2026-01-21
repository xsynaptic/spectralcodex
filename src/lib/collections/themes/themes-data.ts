import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

interface CollectionData {
	themes: Array<CollectionEntry<'themes'>>;
	themesMap: Map<string, CollectionEntry<'themes'>>;
}

export const getThemesCollection = pMemoize(async (): Promise<CollectionData> => {
	const startTime = performance.now();

	const themes = await getCollection('themes');

	const locations = await getCollection('locations');
	const posts = await getCollection('posts');

	for (const entry of themes) {
		entry.data._locationCount = locations.filter((location) =>
			location.data.themes?.some(({ id }) => id === entry.id),
		).length;
		entry.data._postCount = posts.filter((post) =>
			post.data.themes?.some(({ id }) => id === entry.id),
		).length;
	}

	const themesMap = new Map<string, CollectionEntry<'themes'>>();

	for (const entry of themes) {
		themesMap.set(entry.id, entry);
	}

	console.log(
		`[Themes] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { themes, themesMap };
});
