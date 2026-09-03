import { getPublicId } from '../shared/entries.js';

interface RedirectPair {
	fromPath: string;
	toPath: string;
}

interface RedirectableEntry {
	id: string;
	collection: string;
	data: { formerIds?: Array<string> | undefined };
}

// Collections where page URL = /{collection}/{id}/; all others are flat at /{id}/
const collectionPrefixes: Record<string, string | undefined> = {
	themes: 'themes',
	series: 'series',
	regions: 'regions',
	resources: 'resources',
};

function getEntryPath(prefix: string | undefined, id: string) {
	return prefix ? `/${prefix}/${id}/` : `/${id}/`;
}

// Target is the public id, so override (anonymized) locations redirect to the override id, not the real entry id
function getEntryRedirects(entry: RedirectableEntry) {
	const formerIds = entry.data.formerIds;

	if (!formerIds?.length) return [];

	const prefix = collectionPrefixes[entry.collection];
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

export function buildRedirectPairs(entries: Array<RedirectableEntry>) {
	return entries.flatMap((entry) => getEntryRedirects(entry));
}
