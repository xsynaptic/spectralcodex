import type { CollectionEntry, ReferenceDataEntry } from 'astro:content';

import pMemoize from 'p-memoize';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import {
	createRegionContentFunction,
	createRegionsTree,
	getRegionHierarchy,
	getRegionLangCode,
} from '#lib/collections/regions/regions-factory.ts';
import {
	createCollectionData,
	createCollectionLookupByIds,
	getRawCollection,
} from '#lib/utils/collections.ts';

export const getRegionsTree = pMemoize(async () =>
	createRegionsTree(await getRawCollection('regions')),
);

export const getRegionsCollection = createCollectionData({
	collection: 'regions',
	async compute() {
		const [locations, posts, regionsTree] = await Promise.all([
			getRawCollection('locations'),
			getRawCollection('posts'),
			getRegionsTree(),
		]);

		const getRegionContent = createRegionContentFunction({ locations, posts, regionsTree });

		return function computeRegion(entry: CollectionEntry<'regions'>) {
			const hierarchy = getRegionHierarchy(regionsTree, entry.id);

			return {
				...hierarchy,
				_langCode: getRegionLangCode(entry, hierarchy._ancestors),
				...getRegionContent(entry.id),
			};
		};
	},
	label: 'Regions',
});

// Transform an array of strings into collection entries
export const createRegionsByIdsFunction = createCollectionLookupByIds(
	'Regions',
	getRegionsCollection,
);

// Return the first region from an array of region references
export async function createFirstRegionByReferenceFunction() {
	const { entriesMap } = await getRegionsCollection();

	return function getFirstRegionByReference(
		regions: Array<ReferenceDataEntry<'regions'>> | undefined,
	): ComputedEntry<'regions'> | undefined {
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

		return getRegionAncestors(region) satisfies Array<ComputedEntry<'regions'>>;
	};
}

export async function createRegionAncestorsFunction() {
	const getRegionsById = await createRegionsByIdsFunction();

	return function getRegionAncestors(region: ComputedEntry<'regions'>) {
		return [region, ...getRegionsById(region.data._ancestors)] satisfies Array<
			ComputedEntry<'regions'>
		>;
	};
}
