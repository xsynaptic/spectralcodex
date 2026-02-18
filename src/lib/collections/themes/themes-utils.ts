import type { CollectionEntry } from 'astro:content';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';

// Transform IDs into entries (and emit a warning when an ID doesn't match)
export async function getThemesByIdsFunction() {
	const { themesMap } = await getThemesCollection();

	return function getThemesById(ids: Array<string>): Array<CollectionEntry<'themes'>> {
		return ids
			.map((id) => {
				const entry = themesMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Themes] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter((item) => !!item);
	};
}

// Get posts that have a term
export async function getPostsByThemeFunction() {
	const { posts } = await getPostsCollection();

	return function getPostsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'posts'>> {
		return posts.filter(({ data }) => data.themes?.find(({ id }) => id === entry.id));
	};
}

// Get locations that have a term
export async function getLocationsByThemeFunction() {
	const { locations } = await getLocationsCollection();

	return function getLocationsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'locations'>> {
		return locations.filter(({ data }) => data.themes?.find(({ id }) => id === entry.id));
	};
}
