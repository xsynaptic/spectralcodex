import { getSqliteCacheInstance } from '@spectralcodex/shared/cache/sqlite';
import { getCollection } from 'astro:content';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { performance } from 'node:perf_hooks';

import type { RegionComputedDataCache } from '#lib/collections/regions/regions-factory.ts';

import {
	applyComputedDataCache,
	createRegionsTree,
	extractComputedData,
	generateCacheKey,
	populateRegionsContent,
	populateRegionsHierarchy,
	populateRegionsLangCode,
} from '#lib/collections/regions/regions-factory.ts';
import { createCollectionData } from '#lib/utils/collections.ts';

export { resolveLocationRegions } from '#lib/collections/regions/regions-factory.ts';

const cacheInstance = getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'regions-collection');

export const getRegionsCollection = createCollectionData({
	collection: 'regions',
	label: 'Regions',
	async extend(entries) {
		const extendStart = performance.now();

		const locations = await getCollection('locations');
		const posts = await getCollection('posts');

		// The tree is needed even on cache hit
		const regionsTree = createRegionsTree(entries);

		// Generate cache key from current content graph state
		const cacheKey = generateCacheKey({ regions: entries, locations, posts });
		const cacheData = await cacheInstance.get<RegionComputedDataCache>(cacheKey);

		if (cacheData) {
			applyComputedDataCache(entries, cacheData);

			console.log(
				`[Regions] Hierarchy loaded from cache in ${(performance.now() - extendStart).toFixed(5)}ms`,
			);
		} else {
			populateRegionsHierarchy(entries, regionsTree);
			populateRegionsLangCode(entries);
			populateRegionsContent({ entries, locations, posts, regionsTree: regionsTree });

			// Clear old cache entries before setting new one (prevents unbounded growth)
			await cacheInstance.clear();
			await cacheInstance.set(cacheKey, extractComputedData(entries));

			console.log(
				`[Regions] Hierarchy computed in ${(performance.now() - extendStart).toFixed(5)}ms`,
			);
		}

		return { regionsTree };
	},
});
