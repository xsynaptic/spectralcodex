import type { CollectionEntry } from 'astro:content';

import type { ContentMetadataCollectionKey } from '#lib/metadata/metadata-types.ts';

interface CollectionEntryWithContentCount {
	data: {
		_locationCount?: number | undefined;
		_postCount?: number | undefined;
	};
}

// Sort a collection by post and location count, from most to least
export function sortByContentCount<T extends CollectionEntryWithContentCount>(
	entryA: T,
	entryB: T,
) {
	const aTotal = (entryA.data._locationCount ?? 0) + (entryA.data._postCount ?? 0);
	const bTotal = (entryB.data._locationCount ?? 0) + (entryB.data._postCount ?? 0);

	return bTotal - aTotal;
}

// Filter out terms that do *not* have any associated posts or locations
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function filterWithContent<T extends CollectionEntryWithContentCount>(entry: T) {
	if (entry.data._locationCount && entry.data._locationCount > 0) return true;
	if (entry.data._postCount && entry.data._postCount > 0) return true;
	return false;
}

// Filter content by entry quality
export function getFilterEntryQualityFunction<
	T extends CollectionEntry<ContentMetadataCollectionKey>,
>(entryQuality: 1 | 2 | 3 | 4 | 5) {
	return function filterEntryQuality(entry: T): entry is T {
		return !!entry.data.entryQuality && entry.data.entryQuality >= entryQuality;
	};
}
