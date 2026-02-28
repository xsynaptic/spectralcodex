import type { CollectionEntry } from 'astro:content';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { createCollectionLookupByIds } from '#lib/utils/collections.ts';

export const getThemesByIdsFunction = createCollectionLookupByIds('Themes', getThemesCollection);

// Get posts that have a term
export async function getPostsByThemeFunction() {
	const { entries } = await getPostsCollection();

	return function getPostsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'posts'>> {
		return entries.filter(({ data }) => data.themes?.find(({ id }) => id === entry.id));
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
