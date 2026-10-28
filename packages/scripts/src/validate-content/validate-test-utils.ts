import type { ContentEntry } from '@xsynaptic/astro-scripts';

export function makeEntry(
	overrides: Partial<ContentEntry> & Pick<ContentEntry, 'id'>,
): ContentEntry {
	return { collection: 'locations', data: {}, ...overrides };
}

function makeRefs(collection: string, ids: Array<string>) {
	return ids.map((id) => ({ collection, id }));
}

// Regions are stored as references; toReferenceIds transforms them back to ids
export function makeRegionRefs(regionIds: Array<string>) {
	return makeRefs('regions', regionIds);
}
