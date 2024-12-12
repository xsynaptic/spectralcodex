import type { CollectionEntry, CollectionKey } from 'astro:content';

// Filter content by entry quality
export function getFilterEntryQualityFunction<
	T extends CollectionEntry<Exclude<CollectionKey, 'images'>>,
>(entryQuality: 1 | 2 | 3 | 4 | 5) {
	return function filterEntryQuality(entry: T): entry is T {
		return !!entry.data.entryQuality && entry.data.entryQuality >= entryQuality;
	};
}
