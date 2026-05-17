import type { DataStoreEntry } from '../shared/data-store';

interface CheckOptions {
	threshold: number;
}

export type CheckFn = (
	entries: Array<DataStoreEntry>,
	options: CheckOptions,
) => Array<DataStoreEntry>;

function isStub(entry: DataStoreEntry, threshold: number): boolean {
	return (entry.body ?? '').trim().length < threshold;
}

function hasMatchingLink(entry: DataStoreEntry, match: string): boolean {
	const links = entry.data.links;

	if (!Array.isArray(links)) return false;

	return links.some((link: unknown) => {
		if (typeof link === 'string') return link.includes(match);

		if (link && typeof link === 'object' && 'url' in link && typeof link.url === 'string') {
			return link.url.includes(match);
		}

		return false;
	});
}

export const checks: Record<string, CheckFn> = {
	'find-stubs': (entries, { threshold }) => entries.filter((entry) => isStub(entry, threshold)),
	'find-stubs-wiki': (entries, { threshold }) =>
		entries.filter((entry) => isStub(entry, threshold) && hasMatchingLink(entry, 'wikipedia.org')),
};
