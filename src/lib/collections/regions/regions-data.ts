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

export { resolveLocationRegions } from '#lib/collections/regions/regions-factory.ts';

export const getRegionsCollection = createCollectionData({
	collection: 'regions',
	label: 'Regions',
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
