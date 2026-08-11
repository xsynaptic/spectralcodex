import { performance } from 'node:perf_hooks';

import {
	createRegionsTree,
	populateRegionsContent,
	populateRegionsHierarchy,
	populateRegionsLangCode,
} from '#lib/collections/regions/regions-factory.ts';
import { createCollectionData, getRawCollection } from '#lib/utils/collections.ts';

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
