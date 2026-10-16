import type { CollectionEntry } from 'astro:content';

interface ContentPolicy {
	applyOverrides: boolean;
	hideSensitiveLocations: boolean;
}

export const contentPolicy = {
	applyOverrides: !import.meta.env.DEV,
	hideSensitiveLocations: !import.meta.env.DEV,
} satisfies ContentPolicy;

export function isLocationHidden(entry: CollectionEntry<'locations'>) {
	return entry.data.hideLocation === true && contentPolicy.hideSensitiveLocations;
}

export function collectHiddenLocationIds(
	locations: Array<CollectionEntry<'locations'>>,
): Set<string> {
	if (!contentPolicy.hideSensitiveLocations) return new Set<string>();

	return new Set(locations.filter(({ data }) => data.hideLocation).map(({ id }) => id));
}

interface EntryCountData {
	_entryCount?: number | undefined;
	_locationCount?: number | undefined;
	_locations?: Array<string> | undefined;
	_postCount?: number | undefined;
	_posts?: Array<string> | undefined;
}

export function populateContentCounts(
	data: EntryCountData,
	{
		hiddenLocationIds,
		locations,
		posts,
	}: { hiddenLocationIds: Set<string>; locations: Array<string>; posts: Array<string> },
) {
	data._locations = locations;
	data._locationCount = locations.filter((id) => !hiddenLocationIds.has(id)).length;
	data._posts = posts;
	data._postCount = posts.length;
	data._entryCount = data._locationCount + data._postCount;
}
