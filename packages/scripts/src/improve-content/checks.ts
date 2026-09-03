import type { CollectionEntry } from 'astro:content';

type LocationEntry = CollectionEntry<'locations'>;

interface CheckOptions {
	threshold: number;
}

export type CheckFn = (
	entries: Array<LocationEntry>,
	options: CheckOptions,
) => Array<LocationEntry>;

function hasMatchingLink(entry: LocationEntry, match: string): boolean {
	const links = entry.data.links;

	if (!links) return false;

	return links.some((link) => (typeof link === 'string' ? link : link.url).includes(match));
}

export const checks: Record<string, CheckFn> = {
	'bump-quality': (entries) =>
		entries.filter(
			(entry) =>
				entry.data.entryQuality === 1 &&
				(entry.body ?? '').trim().length >= 200 &&
				(entry.data.themes?.length ?? 0) > 0 &&
				/<Link[\s>]/.test(entry.body ?? ''),
		),
	'find-stubs': (entries, { threshold }) =>
		entries.filter((entry) => (entry.body ?? '').trim().length < threshold),
	'find-stubs-wiki': (entries, { threshold }) =>
		entries.filter(
			(entry) =>
				(entry.body ?? '').trim().length < threshold && hasMatchingLink(entry, 'wikipedia.org'),
		),
	'theme-missing': (entries) => entries.filter((entry) => !entry.data.themes?.length),
};
