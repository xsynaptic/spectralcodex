import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

import { matchLinkUrl } from '#lib/collections/resources/resources-utils.ts';

interface CollectionData {
	resources: Array<CollectionEntry<'resources'>>;
	resourcesMap: Map<string, CollectionEntry<'resources'>>;
}

export const getResourcesCollection = pMemoize(async (): Promise<CollectionData> => {
	const startTime = performance.now();

	const resourcesRaw = await getCollection('resources');

	const locations = await getCollection('locations');
	const posts = await getCollection('posts');

	const resources: Array<CollectionEntry<'resources'>> = [];

	for (const entry of resourcesRaw) {
		const resourceId = entry.id;
		const matchPattern = entry.data.match;

		let locationCount = 0;
		let postCount = 0;

		// Count content referencing this resource
		for (const contentEntry of [...locations, ...posts]) {
			// Check URL match via links field (for website-type resources with match field)
			const hasLinkMatch =
				matchPattern &&
				contentEntry.data.links?.some((link) => typeof link === 'string' ? matchLinkUrl(link, matchPattern) : matchLinkUrl(link.url, matchPattern));

			// Check ID match via sources field (for publication-type resources)
			const hasSourceMatch = contentEntry.data.sources?.some(
				(source) => typeof source === 'string' ? source === resourceId : false,
			);

			if (hasLinkMatch || hasSourceMatch) {
				if (contentEntry.collection === 'locations') {
					locationCount++;
				} else {
					postCount++;
				}
			}
		}

		resources.push({
			...entry,
			data: {
				...entry.data,
				locationCount,
				postCount,
				contentCount: locationCount + postCount,
			},
		});
	}

	const resourcesMap = new Map<string, CollectionEntry<'resources'>>();

	for (const entry of resources) {
		resourcesMap.set(entry.id, entry);
	}

	console.log(
		`[Resources] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { resources, resourcesMap };
});
