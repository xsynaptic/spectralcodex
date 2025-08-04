import type { CollectionEntry } from 'astro:content';

import { getLocationsCollection } from '#lib/collections/locations/data.ts';

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

export function sortLocationsByLatitude(
	a: CollectionEntry<'locations'>,
	b: CollectionEntry<'locations'>,
) {
	function getLatitudeCoordinate(entry: CollectionEntry<'locations'>): number {
		return Array.isArray(entry.data.geometry)
			? Math.max(...entry.data.geometry.map(({ coordinates }) => coordinates[1]))
			: entry.data.geometry.coordinates[1];
	}

	return getLatitudeCoordinate(b) - getLatitudeCoordinate(a);
}
