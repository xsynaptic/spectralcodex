import * as R from 'remeda';

import type { CollectionEntry } from 'astro:content';

import { getLocationsCollection } from '@/lib/collections/locations/data';
import { getRegionsByIdsFunction } from '@/lib/collections/regions/utils';

// Used to conditionally render descriptions or body contents of an entry
export const getLocationHasContent = (entry: CollectionEntry<'locations'>) =>
	'body' in entry && typeof entry.body === 'string' && entry.body.trim().length > 0;

// Transform IDs into entries (and emit a warning when an ID doesn't match)
export async function getLocationsByIdsFunction() {
	const { locationsMap } = await getLocationsCollection();

	return function getLocationsById(ids: string[]) {
		return ids
			.map((id) => {
				const entry = locationsMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Locations] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter(
				(entry): entry is CollectionEntry<'locations'> => !!entry,
			) satisfies CollectionEntry<'locations'>[];
	};
}

// Get all locations referenced by a set of posts
export async function getLocationsByPostsFunction() {
	const { locationsMap } = await getLocationsCollection();

	return function getLocationsByPosts(...posts: CollectionEntry<'posts'>[]) {
		const ids = [
			...new Set(posts.flatMap((post) => post.data.locations?.map((entry) => entry.id) ?? [])),
		];

		return ids
			.map((id) => locationsMap.get(id))
			.filter(
				(entry): entry is CollectionEntry<'locations'> => !!entry,
			) satisfies CollectionEntry<'locations'>[];
	};
}

// Saved queries for use in MDX and other places
// TODO: this should eventually be handled via user authentication
export const getObjectiveLocations = async () => {
	const { locations } = await getLocationsCollection();

	const getRegionsByIds = await getRegionsByIdsFunction();

	return R.pipe(
		locations,
		R.filter((entry) => !!entry.data.objective && entry.data.objective >= 1),
		R.filter((entry) =>
			getRegionsByIds(entry.data.regions.map(({ id }) => id)).some(
				(region) => region.id === 'taiwan' || region.data.ancestors?.includes('taiwan'),
			),
		),
	);
};

// Saved queries for use in MDX and other places
// TODO: this should eventually end up in a database or something
export async function getTheaterLocations() {
	const { locations } = await getLocationsCollection();

	const theaterLocations = R.pipe(
		locations,
		R.filter(({ data }) => !!data.themes?.find(({ id }) => id === 'taiwan-theaters')),
	);

	return {
		theaterLocationsLowPrecision: R.pipe(
			theaterLocations,
			R.filter(({ data }) => data.precision === 1),
			R.sort(
				(a, b) => Number(b.data.geometry.coordinates[1]) - Number(a.data.geometry.coordinates[1]),
			),
		),
		theaterLocationsRoughPrecision: R.pipe(
			theaterLocations,
			R.filter(({ data }) => data.precision === 2),
			R.sort(
				(a, b) => Number(b.data.geometry.coordinates[1]) - Number(a.data.geometry.coordinates[1]),
			),
		),
		theaterLocationsUnknownStatus: R.pipe(
			theaterLocations,
			R.filter(({ data }) => data.precision >= 3 && data.status === 'unknown'),
			R.sort(
				(a, b) => Number(b.data.geometry.coordinates[1]) - Number(a.data.geometry.coordinates[1]),
			),
		),
		theaterLocationsJapanese: R.pipe(
			theaterLocations,
			R.filter(
				({ data }) => !!data.themes?.find(({ id }) => id === 'taiwan-japanese-colonial-era'),
			),
			R.filter(({ data }) => !['demolished', 'unknown'].includes(data.status)),
			R.sort(
				(a, b) => Number(b.data.geometry.coordinates[1]) - Number(a.data.geometry.coordinates[1]),
			),
		),
		theaterLocationsObjectivesTop: R.pipe(
			theaterLocations,
			R.filter(({ data }) => data.objective !== undefined && data.objective >= 4),
			R.sort(
				(a, b) => Number(b.data.geometry.coordinates[1]) - Number(a.data.geometry.coordinates[1]),
			),
		),
		theaterLocationsObjectivesAll: R.pipe(
			theaterLocations,
			R.filter(
				({ data }) => data.objective !== undefined && data.objective > 1 && data.objective < 4,
			),
			R.sort(
				(a, b) => Number(b.data.geometry.coordinates[1]) - Number(a.data.geometry.coordinates[1]),
			),
		),
	};
}
