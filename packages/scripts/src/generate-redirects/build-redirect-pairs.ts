import { getPublicId } from '@spectralcodex/shared/entries';
import { getOpenGraphId } from '@spectralcodex/shared/open-graph';

interface RedirectBuild {
	// A former id matching a live page or card; fatal, because the rule takes it off the site
	collisions: Array<string>;
	pairs: Array<RedirectPair>;
	skipped: Array<string>;
}

interface RedirectPair {
	fromPath: string;
	toPath: string;
}

interface RedirectableEntry {
	collection: string;
	data: { formerIds?: Array<string> | undefined };
	id: string;
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

// Card ids are flat in every collection, so two prefixed pages can share one card path
function getCardPath(id: string) {
	return `/og/${getOpenGraphId(id)}.jpg`;
}

function getLivePaths(entry: RedirectableEntry) {
	const publicId = getPublicId(entry);

	return [getEntryPath(collectionPrefixes[entry.collection], publicId), getCardPath(publicId)];
}

// Target is the public id, so override (anonymized) locations redirect to the override id, not the real entry id
// Each former id yields a page rule and a card rule, kept together so both land or neither does
function getEntryRedirects(entry: RedirectableEntry) {
	const formerIds = entry.data.formerIds;

	if (!formerIds?.length) return [];

	const prefix = collectionPrefixes[entry.collection];
	const canonicalId = getPublicId(entry);
	const redirects: Array<Array<RedirectPair>> = [];

	for (const formerId of formerIds) {
		// A former id matching the canonical id would redirect to itself
		if (formerId === canonicalId) continue;

		redirects.push([
			{ fromPath: getEntryPath(prefix, formerId), toPath: getEntryPath(prefix, canonicalId) },
			{ fromPath: getCardPath(formerId), toPath: getCardPath(canonicalId) },
		]);
	}

	return redirects;
}

// Entries are walked in the order given, so an earlier collection claims a shared path first
export function buildRedirectPairs(entries: Array<RedirectableEntry>) {
	const livePaths = new Set(entries.flatMap((entry) => getLivePaths(entry)));
	const claimedPaths = new Set<string>();
	const build: RedirectBuild = { collisions: [], pairs: [], skipped: [] };
	const redirectGroups = entries.flatMap((entry) => getEntryRedirects(entry));

	for (const redirects of redirectGroups) {
		const fromPaths = redirects.map(({ fromPath }) => fromPath);
		const livePath = fromPaths.find((fromPath) => livePaths.has(fromPath));

		if (livePath) {
			build.collisions.push(`${livePath} is a live path`);
			continue;
		}

		const claimedPath = fromPaths.find((fromPath) => claimedPaths.has(fromPath));

		// First claim wins, which is an answer rather than a defect
		if (claimedPath) {
			build.skipped.push(`${claimedPath} is claimed by an earlier rule`);
			continue;
		}

		for (const fromPath of fromPaths) {
			claimedPaths.add(fromPath);
		}

		build.pairs.push(...redirects);
	}

	return build;
}
