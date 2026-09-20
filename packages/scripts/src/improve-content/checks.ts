import type { CollectionEntry } from 'astro:content';

import { getLinkUrls, isLinkUrlMatch } from '@spectralcodex/shared/links';

export type CheckFn = (
	entries: Array<LocationEntry>,
	options: CheckOptions,
) => Array<LocationEntry>;

interface CheckOptions {
	threshold: number;
}

type LocationEntry = CollectionEntry<'locations'>;

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
				(entry.body ?? '').trim().length < threshold &&
				getLinkUrls(entry.data.links).some((linkUrl) => isLinkUrlMatch(linkUrl, 'wikipedia.org')),
		),
	'theme-missing': (entries) => entries.filter((entry) => !entry.data.themes?.length),
};
