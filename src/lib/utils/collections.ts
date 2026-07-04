import type { CollectionEntry, CollectionKey } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize, { pMemoizeClear } from 'p-memoize';

interface CollectionEntryWithContentCount {
	data: {
		_locationCount?: number | undefined;
		_postCount?: number | undefined;
	};
}

/**
 * Resolve the public-facing ID for a content entry
 * Locations with overrides return the override ID; all other entries return entry.id
 */
export function getPublicId(entry: { id: string; data: Record<string, unknown> }): string {
	const override = entry.data.override as { id?: string } | undefined;

	return override?.id ?? entry.id;
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
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- generic lets Remeda's data-last R.filter preserve the element type instead of widening it
export function filterWithContent<T extends CollectionEntryWithContentCount>(entry: T) {
	if (entry.data._locationCount && entry.data._locationCount > 0) return true;
	return Boolean(entry.data._postCount && entry.data._postCount > 0);
}

// Collection data factory utilities
interface CollectionResult<K extends CollectionKey> {
	entries: Array<CollectionEntry<K>>;
	entriesMap: Map<string, CollectionEntry<K>>;
}

// Per-entry mutation over the loaded entries; stamps computed fields onto entry.data in place
type CollectionMutateFunction<K extends CollectionKey> = (
	entries: Array<CollectionEntry<K>>,
	entriesMap: Map<string, CollectionEntry<K>>,
) => Promise<void> | void;

// Collection-level derivation; its return is merged into the result so consumers can read the artifact
type CollectionExtendFunction<K extends CollectionKey, A extends object> = (
	entries: Array<CollectionEntry<K>>,
	entriesMap: Map<string, CollectionEntry<K>>,
) => Promise<A> | A;

// Factory function to create memoized collection data
export function createCollectionData<K extends CollectionKey, A extends object = object>(config: {
	collection: K;
	label?: string;
	mutate?: CollectionMutateFunction<K>;
	extend?: CollectionExtendFunction<K, A>;
}) {
	const getData = pMemoize(async (): Promise<CollectionResult<K> & A> => {
		const startTime = performance.now();

		const entries = await getCollection(config.collection);

		const entriesMap = new Map<string, CollectionEntry<K>>();

		for (const entry of entries) {
			entriesMap.set(entry.id, entry);
		}

		await config.mutate?.(entries, entriesMap);

		const extra = (await config.extend?.(entries, entriesMap)) ?? ({} as A);

		console.log(
			`[${config.label ?? config.collection}] Collection data generated in ${(performance.now() - startTime).toFixed(4)}ms`,
		);

		return { entries, entriesMap, ...extra };
	});

	// In dev the content store can load empty if Astro's data-store module fails to parse
	// Memoizing that empty result would strand it for the whole session; evict empties to allow for recovery
	return async function (): Promise<CollectionResult<K> & A> {
		const result = await getData();

		if (import.meta.env.DEV && result.entries.length === 0) {
			pMemoizeClear(getData);
		}

		return result;
	};
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
