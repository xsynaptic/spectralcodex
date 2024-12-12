import type { CollectionEntry } from 'astro:content';

import { getLocationsCollection } from '@/lib/collections/locations/data';
import { getPostsCollection } from '@/lib/collections/posts/data';
import { getThemesCollection } from '@/lib/collections/themes/data';

// Transform IDs into entries (and emit a warning when an ID doesn't match)
export async function getThemesByIdsFunction() {
	const { themesMap } = await getThemesCollection();

	return function getThemesById(ids: string[]) {
		return ids
			.map((id) => {
				const entry = themesMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Themes] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter((item) => !!item) satisfies CollectionEntry<'themes'>[];
	};
}

// Get posts that have a term
export async function getPostsByThemeFunction() {
	const { posts } = await getPostsCollection();

	return function getPostsByTheme(entry: CollectionEntry<'themes'>) {
		return posts.filter(({ data }) =>
			data.themes?.find(({ id }) => id === entry.id),
		) satisfies CollectionEntry<'posts'>[];
	};
}

// Get locations that have a term
export async function getLocationsByThemeFunction() {
	const { locations } = await getLocationsCollection();

	return function getLocationsByTheme(entry: CollectionEntry<'themes'>) {
		return locations.filter(({ data }) =>
			data.themes?.find(({ id }) => id === entry.id),
		) satisfies CollectionEntry<'locations'>[];
	};
}

// Filter out terms that do *not* have any associated posts
export async function getFilterTermsPostsFunction() {
	const getPostsByTerm = await getPostsByThemeFunction();

	return function getFilterTermsPosts(term: CollectionEntry<'themes'>) {
		return getPostsByTerm(term).length > 0;
	};
}

// Filter out terms that do *not* have any associated posts or locations
export function filterThemesContent(entry: CollectionEntry<'themes'>) {
	if (entry.data.locationCount && entry.data.locationCount > 0) return true;
	if (entry.data.postCount && entry.data.postCount > 0) return true;
	return false;
}

// Sort a collection of terms by post and location count, from most to least
export function sortThemesByContentCount(
	entryA: CollectionEntry<'themes'>,
	entryB: CollectionEntry<'themes'>,
) {
	const totalA = (entryA.data.postCount ?? 0) + (entryA.data.locationCount ?? 0);
	const totalB = (entryB.data.postCount ?? 0) + (entryB.data.locationCount ?? 0);

	return totalB - totalA;
}
