import type { CollectionEntry } from 'astro:content';

import { getLocationsCollection } from '#lib/collections/locations/data.ts';
import { getPostsCollection } from '#lib/collections/posts/data.ts';
import { getThemesCollection } from '#lib/collections/themes/data.ts';

// Transform IDs into entries (and emit a warning when an ID doesn't match)
export async function getThemesByIdsFunction() {
	const { themesMap } = await getThemesCollection();

	return function getThemesById(ids: Array<string>) {
		return ids
			.map((id) => {
				const entry = themesMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Themes] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter((item) => !!item) satisfies Array<CollectionEntry<'themes'>>;
	};
}

// Get posts that have a term
export async function getPostsByThemeFunction() {
	const { posts } = await getPostsCollection();

	return function getPostsByTheme(entry: CollectionEntry<'themes'>) {
		return posts.filter(({ data }) =>
			data.themes?.find(({ id }) => id === entry.id),
		) satisfies Array<CollectionEntry<'posts'>>;
	};
}

// Get locations that have a term
export async function getLocationsByThemeFunction() {
	const { locations } = await getLocationsCollection();

	return function getLocationsByTheme(entry: CollectionEntry<'themes'>) {
		return locations.filter(({ data }) =>
			data.themes?.find(({ id }) => id === entry.id),
		) satisfies Array<CollectionEntry<'locations'>>;
	};
}

// Filter out terms that do *not* have any associated posts
export async function getFilterTermsPostsFunction() {
	const getPostsByTerm = await getPostsByThemeFunction();

	return function getFilterTermsPosts(term: CollectionEntry<'themes'>) {
		return getPostsByTerm(term).length > 0;
	};
}
