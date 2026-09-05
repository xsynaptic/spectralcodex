import type { ContentEntry } from '#shared/astro-content.ts';

export function makeEntry(
	overrides: Partial<ContentEntry> & Pick<ContentEntry, 'id'>,
): ContentEntry {
	return { collection: 'locations', data: {}, ...overrides };
}

// Regions are stored as references; toReferenceIds transforms them back to ids
export function makeRegionRefs(regionIds: Array<string>) {
	return makeRefs('regions', regionIds);
}

export function makeRefs(collection: string, ids: Array<string>) {
	return ids.map((id) => ({ id, collection }));
}
