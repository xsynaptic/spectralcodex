import type { CollectionEntry, CollectionKey } from 'astro:content';

interface CollectionEntryWithContentCount {
	data: {
		locationCount?: number | undefined;
		postCount?: number | undefined;
	};
}

// Sort a collection by post and location count, from most to least
export function sortByContentCount<T extends CollectionEntryWithContentCount>(
	entryA: T,
	entryB: T,
) {
	const aTotal = (entryA.data.locationCount ?? 0) + (entryA.data.postCount ?? 0);
	const bTotal = (entryB.data.locationCount ?? 0) + (entryB.data.postCount ?? 0);

	return bTotal - aTotal;
}

// Filter out terms that do *not* have any associated posts or locations
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function filterWithContent<T extends CollectionEntryWithContentCount>(entry: T) {
	if (entry.data.locationCount && entry.data.locationCount > 0) return true;
	if (entry.data.postCount && entry.data.postCount > 0) return true;
	return false;
}

// Filter content by entry quality
export function getFilterEntryQualityFunction<
	T extends CollectionEntry<Exclude<CollectionKey, 'images'>>,
>(entryQuality: 1 | 2 | 3 | 4 | 5) {
	return function filterEntryQuality(entry: T): entry is T {
		return !!entry.data.entryQuality && entry.data.entryQuality >= entryQuality;
	};
}
