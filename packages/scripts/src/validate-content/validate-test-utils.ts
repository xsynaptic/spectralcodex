import type { DataStoreEntry } from '../shared/data-store';

export function makeEntry(
	overrides: Partial<DataStoreEntry> & Pick<DataStoreEntry, 'id'>,
): DataStoreEntry {
	return { data: {}, ...overrides };
}

// For silencing check wrappers via mockImplementation; inline () => {} trips no-empty-function
export function noop() {
	// Intentionally empty
}

// Regions are stored as data-store references; RegionsSchema transforms them back to ids
export function makeRegionRefs(regionIds: Array<string>) {
	return regionIds.map((regionId) => ({ id: regionId, collection: 'regions' as const }));
}
