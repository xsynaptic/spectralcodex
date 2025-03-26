import type { CollectionEntry, CollectionKey } from 'astro:content';

import * as R from 'remeda';

import { getRegionsCollection } from '#lib/collections/regions/data.ts';

/**
 * Type guard to ensure this collection entry is configured for regions
 */
function isCollectionEntryWithRegions(
	entry: CollectionEntry<CollectionKey>,
): entry is CollectionEntry<'ephemera' | 'locations' | 'pages' | 'posts' | 'regions'> {
	return R.isIncludedIn(entry.collection, ['ephemera', 'locations', 'pages', 'posts', 'regions']);
}

/**
 * Transform an array of strings into collection entries
 */
export async function getRegionsByIdsFunction() {
	const { regionsMap } = await getRegionsCollection();

	return function getRegionsById(ids: Array<string>) {
		return ids
			.map((id) => {
				const entry = regionsMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Regions] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter((entry): entry is CollectionEntry<'regions'> => !!entry) satisfies Array<
			CollectionEntry<'regions'>
		>;
	};
}

/**
 * Hierarchical functions
 */
// Get all ancestors of the specified region
export async function getRegionAncestorsFunction() {
	const getRegionsById = await getRegionsByIdsFunction();

	return function getRegionAncestors(region: CollectionEntry<'regions'>) {
		const ancestors = region.data.ancestors ? getRegionsById(region.data.ancestors) : [];

		return [region, ...ancestors] satisfies Array<CollectionEntry<'regions'>>;
	};
}

// References are not the complete entry; they still need to be fetched from the collection
export async function getRegionAncestorsByIdFunction() {
	const { regionsMap } = await getRegionsCollection();
	const getRegionAncestors = await getRegionAncestorsFunction();

	return function getRegionAncestorsById(regionId: string) {
		const region = regionsMap.get(regionId);

		if (!region)
			throw new Error(`Error: could not find "${regionId}" in the "regions" collection.`);

		return getRegionAncestors(region) satisfies Array<CollectionEntry<'regions'>>;
	};
}

// A utility function to find the common ancestor ID from an arbitrary set of regions
// Used when generating content metadata
// TODO: check whether this is the right function for the task
export async function getRegionCommonAncestorFunction() {
	const getRegionsById = await getRegionsByIdsFunction();
	const getRegionAncestors = await getRegionAncestorsFunction();

	return function getRegionCommonAncestor(regionIds: Array<string>): string | undefined {
		const regions = getRegionsById(regionIds);

		if (regions.length === 0) return;

		const regionAncestors = regions.map(getRegionAncestors);

		if (!regionAncestors[0]) return;

		for (const ancestor of regionAncestors[0]) {
			if (regionAncestors.every((regionAncestor) => regionAncestor.includes(ancestor))) {
				return ancestor.id;
			}
		}
		return;
	};
}

/**
 * Primary region
 */
// Return the first (primary) region associated with a location
export async function getPrimaryRegionByLocationFunction() {
	const { regionsMap } = await getRegionsCollection();

	return function getPrimaryRegionByLocation(
		location: CollectionEntry<'locations'>,
	): CollectionEntry<'regions'> | undefined {
		const regionId = location.data.regions.at(0)?.id;

		return regionId ? regionsMap.get(regionId) : undefined;
	};
}

// Used by the content metadata index
export async function getPrimaryRegionIdFromEntryFunction() {
	const getRegionCommonAncestor = await getRegionCommonAncestorFunction();

	return function getPrimaryRegionIdFromEntry<T extends CollectionKey>(entry: CollectionEntry<T>) {
		if (
			isCollectionEntryWithRegions(entry) &&
			'regions' in entry.data &&
			entry.data.regions &&
			entry.data.regions.length > 0
		) {
			return entry.data.regions.length > 1
				? getRegionCommonAncestor(entry.data.regions.map(({ id }) => id))
				: entry.data.regions.at(0)?.id;
		}
		return;
	};
}
