import type { CollectionEntry, CollectionKey } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

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

// Collection data factory utilities
interface CollectionResult<K extends CollectionKey> {
	entries: Array<CollectionEntry<K>>;
	entriesMap: Map<string, CollectionEntry<K>>;
}

// Factory function to create collection data, optionally augmenting the data with additional computed properties
export function createCollectionData<K extends CollectionKey>(config: {
	collection: K;
	label?: string;
	augment?: (
		entries: Array<CollectionEntry<K>>,
		entriesMap: Map<string, CollectionEntry<K>>,
	) => Promise<void> | void;
}) {
	return pMemoize(async (): Promise<CollectionResult<K>> => {
		const startTime = performance.now();

		const entries = await getCollection(config.collection);

		const entriesMap = new Map<string, CollectionEntry<K>>();

		for (const entry of entries) {
			entriesMap.set(entry.id, entry);
		}

		if (config.augment) {
			await config.augment(entries, entriesMap);
		}

		console.log(
			`[${config.label ?? config.collection}] Collection data generated in ${(performance.now() - startTime).toFixed(4)}ms`,
		);

		return { entries, entriesMap };
	});
}

// Factory function to create a lookup function for collection entries by ID
export function createCollectionLookupByIds<K extends CollectionKey>(
	label: string,
	getData: () => Promise<CollectionResult<K>>,
) {
	return async function () {
		const { entriesMap } = await getData();

		return function (ids: Array<string>) {
			return ids
				.map((id) => {
					const entry = entriesMap.get(id);

					if (!entry && import.meta.env.DEV) {
						console.warn(`[${label}] Requested entry "${id}" not found!`);
					}
					return entry;
				})
				.filter((entry): entry is CollectionEntry<K> => !!entry);
		};
	};
}
