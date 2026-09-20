import type { OpenGraphContentEntry } from '#og-image/types.ts';

export function makeOgEntry(overrides: Partial<OpenGraphContentEntry> = {}): OpenGraphContentEntry {
	return {
		collection: 'posts',
		digest: 'digest',
		id: 'entry',
		imageFeaturedId: 'image/entry.jpg',
		isFallback: false,
		title: 'Title',
		...overrides,
	};
}
