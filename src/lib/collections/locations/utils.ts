import type { CollectionEntry } from 'astro:content';

import { getLocationsCollection } from '#lib/collections/locations/data.ts';

// Used to conditionally render descriptions or body contents of an entry
export const getLocationHasContent = (entry: CollectionEntry<'locations'>) =>
	'body' in entry && typeof entry.body === 'string' && entry.body.trim().length > 0;

// Transform IDs into entries (and emit a warning when an ID doesn't match)
export async function getLocationsByIdsFunction() {
	const { locationsMap } = await getLocationsCollection();

	return function getLocationsById(ids: Array<string>) {
		return ids
			.map((id) => {
				const entry = locationsMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Locations] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter((entry): entry is CollectionEntry<'locations'> => !!entry) satisfies Array<
			CollectionEntry<'locations'>
		>;
	};
}

// Get all locations referenced by a set of posts
export async function getLocationsByPostsFunction() {
	const { locationsMap } = await getLocationsCollection();

	return function getLocationsByPosts(...posts: Array<CollectionEntry<'posts'>>) {
		const ids = [
			...new Set(posts.flatMap((post) => post.data.locations?.map((entry) => entry.id) ?? [])),
		];

		return ids
			.map((id) => locationsMap.get(id))
			.filter((entry): entry is CollectionEntry<'locations'> => !!entry) satisfies Array<
			CollectionEntry<'locations'>
		>;
	};
}
