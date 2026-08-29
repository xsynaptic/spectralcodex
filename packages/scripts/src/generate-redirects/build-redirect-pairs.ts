import type { DataStoreCollections, DataStoreEntry } from '../shared/data-store';

import { getDataStoreCollection, getPublicId } from '../shared/data-store';

interface RedirectPair {
	fromPath: string;
	toPath: string;
}

// Collections where page URL = /{id}/
const flatCollections = ['locations', 'posts', 'pages'];

// Collections where page URL = /{collection}/{id}/
const prefixedCollections: Record<string, string> = {
	themes: 'themes',
	series: 'series',
	regions: 'regions',
	resources: 'resources',
};

function getEntryPath(prefix: string | undefined, id: string) {
	return prefix ? `/${prefix}/${id}/` : `/${id}/`;
}

// Target is the public id, so override (anonymized) locations redirect to the override id, not the real entry id
function getEntryRedirects(entry: DataStoreEntry, prefix: string | undefined) {
	const formerIds = entry.data.formerIds as Array<string> | undefined;

	if (!formerIds?.length) return [];

	const canonicalId = getPublicId(entry);
	const redirects: Array<RedirectPair> = [];

	for (const formerId of formerIds) {
		// A former id matching the canonical id would redirect to itself
		if (formerId === canonicalId) continue;

		redirects.push(
			{ fromPath: getEntryPath(prefix, formerId), toPath: getEntryPath(prefix, canonicalId) },
			{ fromPath: `/og/${formerId}.jpg`, toPath: `/og/${canonicalId}.jpg` },
		);
	}

	return redirects;
}

export function buildRedirectPairs(collections: DataStoreCollections) {
	const redirects: Array<RedirectPair> = [];

	for (const collectionName of [...flatCollections, ...Object.keys(prefixedCollections)]) {
		const entries = getDataStoreCollection(collections, [collectionName]);

		for (const entry of entries) {
			redirects.push(...getEntryRedirects(entry, prefixedCollections[collectionName]));
		}
	}

	return redirects;
}
