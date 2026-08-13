import type { DataStoreCollections, DataStoreEntry } from '../shared/data-store';

export function makeEntry(
	overrides: Partial<DataStoreEntry> & Pick<DataStoreEntry, 'id'>,
): DataStoreEntry {
	return { data: {}, ...overrides };
}

// For silencing check wrappers via mockImplementation; inline () => {} trips no-empty-function
export function noop() {
	// Intentionally empty
}

// Regions are stored as data-store references; toReferenceIds transforms them back to ids
export function makeRegionRefs(regionIds: Array<string>) {
	return makeRefs('regions', regionIds);
}

export function makeRefs(collection: string, ids: Array<string>) {
	return ids.map((id) => ({ id, collection }));
}

export function makeCollections(entriesByCollection: Record<string, Array<DataStoreEntry>>) {
	const collections: DataStoreCollections = new Map();

	for (const [name, entries] of Object.entries(entriesByCollection)) {
		collections.set(name, new Map(entries.map((entry) => [entry.id, entry])));
	}

	return collections;
}
