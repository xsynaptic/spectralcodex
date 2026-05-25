import type { DataStoreEntry } from '../shared/data-store';

interface CheckOptions {
	threshold: number;
}

export type CheckFn = (
	entries: Array<DataStoreEntry>,
	options: CheckOptions,
) => Array<DataStoreEntry>;

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
	'bump-quality': (entries) =>
		entries.filter(
			(entry) =>
				entry.data.entryQuality === 1 &&
				(entry.body ?? '').trim().length >= 200 &&
				Array.isArray(entry.data.themes) &&
				entry.data.themes.length > 0 &&
				/<Link[\s>]/.test(entry.body ?? ''),
		),
	'find-stubs': (entries, { threshold }) =>
		entries.filter((entry) => (entry.body ?? '').trim().length < threshold),
	'find-stubs-wiki': (entries, { threshold }) =>
		entries.filter(
			(entry) =>
				(entry.body ?? '').trim().length < threshold && hasMatchingLink(entry, 'wikipedia.org'),
		),
	'theme-missing': (entries) =>
		entries.filter((entry) => !Array.isArray(entry.data.themes) || entry.data.themes.length === 0),
};
