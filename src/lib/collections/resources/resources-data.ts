import pMemoize from 'p-memoize';

import type { ResourceAssociation } from '#lib/collections/resources/resources-association.ts';

import { buildResourceAssociation } from '#lib/collections/resources/resources-association.ts';
import { createCollectionData, getRawCollection } from '#lib/utils/collections.ts';

// Raw reads; this runs during resources provisioning, and the match rule reads frontmatter only
export const getResourceAssociation = pMemoize(async (): Promise<ResourceAssociation> => {
	const [resources, locations, posts] = await Promise.all([
		getRawCollection('resources'),
		getRawCollection('locations'),
		getRawCollection('posts'),
	]);

	return buildResourceAssociation(resources, locations, posts);
});

export const getResourcesCollection = createCollectionData({
	collection: 'resources',
	label: 'Resources',
	async mutate(entries) {
		const { locationIdsByResourceId, postIdsByResourceId } = await getResourceAssociation();

		for (const entry of entries) {
			const locationCount = locationIdsByResourceId.get(entry.id)?.length ?? 0;
			const postCount = postIdsByResourceId.get(entry.id)?.length ?? 0;

			entry.data._locationCount = locationCount;
			entry.data._postCount = postCount;
			entry.data._entryCount = locationCount + postCount;
		}
	},
});
