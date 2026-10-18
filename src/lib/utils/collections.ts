import type { CollectionEntry, CollectionKey } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize, { pMemoizeClear } from 'p-memoize';

interface CollectionEntryWithEntryCount {
	data: {
		_entryCount: number;
	};
}

interface CollectionResult<E extends { id: string }> {
	entries: Array<E>;
	entriesMap: Map<string, E>;
}

type CollectionComputeFunction<K extends CollectionKey, C extends object> = (
	entries: Array<CollectionEntry<K>>,
) => ((entry: CollectionEntry<K>) => C) | Promise<(entry: CollectionEntry<K>) => C>;

type ComputedCollectionEntry<K extends CollectionKey, C extends object> = Omit<
	CollectionEntry<K>,
	'data'
> & {
	data: C & Omit<CollectionEntry<K>['data'], keyof C>;
};

// Factory for memoized collection data with computed fields
export function createCollectionData<K extends CollectionKey, C extends object>(config: {
	collection: K;
	compute: CollectionComputeFunction<K, C>;
	label?: string;
}): () => Promise<CollectionResult<ComputedCollectionEntry<K, C>>>;
export function createCollectionData<K extends CollectionKey>(config: {
	collection: K;
	label?: string;
}): () => Promise<CollectionResult<CollectionEntry<K>>>;
export function createCollectionData<K extends CollectionKey, C extends object>(config: {
	collection: K;
	compute?: CollectionComputeFunction<K, C>;
	label?: string;
}): () => Promise<CollectionResult<CollectionEntry<K> | ComputedCollectionEntry<K, C>>> {
	const getData = pMemoize(async () => {
		const startTime = performance.now();

		const rawEntries = await getCollection(config.collection);

		const entries = config.compute ? await computeEntries(rawEntries, config.compute) : rawEntries;

		const entriesMap = new Map(entries.map((entry) => [entry.id, entry]));

		console.log(
			`[${config.label ?? config.collection}] Collection data generated in ${(performance.now() - startTime).toFixed(4)}ms`,
		);

		return { entries, entriesMap };
	});

	// In dev the content store can load empty if Astro's data-store module fails to parse
	// Memoizing that empty result would strand it for the whole session; evict empties to allow for recovery
	return async function () {
		const result = await getData();

		if (import.meta.env.DEV && result.entries.length === 0) {
			pMemoizeClear(getData);
		}

		return result;
	};
}

async function computeEntries<K extends CollectionKey, C extends object>(
	entries: Array<CollectionEntry<K>>,
	compute: CollectionComputeFunction<K, C>,
) {
	const computeEntry = await compute(entries);

	return entries.map((entry) => ({
		...entry,
		data: { ...entry.data, ...computeEntry(entry) },
	}));
}

export function hasEntries(entry: CollectionEntryWithEntryCount) {
	return entry.data._entryCount > 0;
}

// Sort a collection by entry count, from most to least
export function sortByEntryCount<T extends CollectionEntryWithEntryCount>(entryA: T, entryB: T) {
	return entryB.data._entryCount - entryA.data._entryCount;
}

// Explicit raw read for cross-collection assembly; bypasses the collection wrappers to avoid circular init
const rawCollectionPromises = new Map<
	CollectionKey,
	Promise<Array<CollectionEntry<CollectionKey>>>
>();

// Factory function to create a lookup function for collection entries by ID
export function createCollectionLookupByIds<E extends { id: string }>(
	label: string,
	getData: () => Promise<CollectionResult<E>>,
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
				.filter((entry): entry is E => !!entry);
		};
	};
}

export async function getRawCollection<K extends CollectionKey>(
	collection: K,
): Promise<Array<CollectionEntry<K>>> {
	let promise = rawCollectionPromises.get(collection);

	if (!promise) {
		promise = getCollection(collection);
		rawCollectionPromises.set(collection, promise);
	}

	const entries = (await promise) as Array<CollectionEntry<K>>;

	// Mirror createCollectionData: evict an empty dev load so the content store can recover next call
	if (import.meta.env.DEV && entries.length === 0) {
		rawCollectionPromises.delete(collection);
	}

	return entries;
}
