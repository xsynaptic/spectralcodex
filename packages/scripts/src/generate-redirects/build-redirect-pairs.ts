import type { DataStoreCollections } from '../shared/data-store';

import { getDataStoreCollection, getPublicId } from '../shared/data-store';

interface RedirectPair {
	fromPath: string;
	toPath: string;
}

// Collections where page URL = /{id}/
const FLAT_COLLECTIONS = ['locations', 'posts', 'notes', 'pages'];

// Collections where page URL = /{collection}/{id}/
const PREFIXED_COLLECTIONS: Record<string, string> = {
	themes: 'themes',
	series: 'series',
	regions: 'regions',
	resources: 'resources',
};

// Target is the public id, so override (anonymized) locations redirect to the override id, not the real entry id
export function buildRedirectPairs(collections: DataStoreCollections) {
	const redirects: Array<RedirectPair> = [];

	for (const collectionName of [...FLAT_COLLECTIONS, ...Object.keys(PREFIXED_COLLECTIONS)]) {
		const entries = getDataStoreCollection(collections, [collectionName]);

		for (const entry of entries) {
			const formerIds = entry.data.formerIds as Array<string> | undefined;

			if (!formerIds?.length) continue;

			const prefix = PREFIXED_COLLECTIONS[collectionName];
			const canonicalId = getPublicId(entry);

			for (const formerId of formerIds) {
				// Avoid infinite loops
				if (formerId === canonicalId) continue;

				const formerPath = prefix ? `/${prefix}/${formerId}/` : `/${formerId}/`;
				const currentPath = prefix ? `/${prefix}/${canonicalId}/` : `/${canonicalId}/`;

				redirects.push(
					{ fromPath: formerPath, toPath: currentPath },
					{ fromPath: `/og/${formerId}.jpg`, toPath: `/og/${canonicalId}.jpg` },
				);
			}
		}
	}

	return redirects;
}
