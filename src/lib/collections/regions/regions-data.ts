import type { CollectionEntry, ReferenceDataEntry } from 'astro:content';

import { performance } from 'node:perf_hooks';

import {
	createRegionsTree,
	populateRegionsContent,
	populateRegionsHierarchy,
	populateRegionsLangCode,
} from '#lib/collections/regions/regions-factory.ts';
import {
	createCollectionData,
	createCollectionLookupByIds,
	getRawCollection,
} from '#lib/utils/collections.ts';

export const getRegionsCollection = createCollectionData({
	collection: 'regions',
	async extend(entries) {
		const extendStart = performance.now();

		const locations = await getRawCollection('locations');
		const posts = await getRawCollection('posts');

		const regionsTree = createRegionsTree(entries);

		populateRegionsHierarchy(entries, regionsTree);
		populateRegionsLangCode(entries);
		populateRegionsContent({ entries, locations, posts, regionsTree });

		console.log(
			`[Regions] Hierarchy computed in ${(performance.now() - extendStart).toFixed(5)}ms`,
		);

		return { regionsTree };
	},
	label: 'Regions',
});

// Transform an array of strings into collection entries
export const createRegionsByIdsFunction = createCollectionLookupByIds<'regions'>(
	'Regions',
	getRegionsCollection,
);

// Return the first region from an array of region references
export async function createFirstRegionByReferenceFunction() {
	const { entriesMap } = await getRegionsCollection();

	return function getFirstRegionByReference(
		regions: Array<ReferenceDataEntry<'regions'>> | undefined,
	): CollectionEntry<'regions'> | undefined {
		if (!regions) return;

		const regionId = regions.at(0)?.id;

		return regionId ? entriesMap.get(regionId) : undefined;
	};
}

// References are not the complete entry; they still need to be fetched from the collection
export async function createRegionAncestorsByIdFunction() {
	const { entriesMap } = await getRegionsCollection();
	const getRegionAncestors = await createRegionAncestorsFunction();

	return function getRegionAncestorsById(regionId: string) {
		const region = entriesMap.get(regionId);

		if (!region)
			throw new Error(`Error: could not find "${regionId}" in the "regions" collection.`);

		return getRegionAncestors(region) satisfies Array<CollectionEntry<'regions'>>;
	};
}

export async function createRegionAncestorsFunction() {
	const getRegionsById = await createRegionsByIdsFunction();

	return function getRegionAncestors(region: CollectionEntry<'regions'>) {
		const ancestors = region.data._ancestors ? getRegionsById(region.data._ancestors) : [];

		return [region, ...ancestors] satisfies Array<CollectionEntry<'regions'>>;
	};
}
