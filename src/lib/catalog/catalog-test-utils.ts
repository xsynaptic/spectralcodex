import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

// Shared CatalogItem factory for unit tests; pass only the fields a test cares about
export function makeCatalogItem(
	overrides: Partial<CatalogItem> & Pick<CatalogItem, 'id' | 'collection'>,
): CatalogItem {
	return {
		title: overrides.id,
		titleMultilingual: undefined,
		description: undefined,
		url: `/${overrides.id}`,
		imageId: undefined,
		regionPrimaryId: undefined,
		postCount: undefined,
		locationCount: undefined,
		linksCount: undefined,
		wordCount: undefined,
		backlinks: new Set<string>(),
		// Local-time constructor (not an ISO string) so date-bucketing tests stay timezone stable
		dateCreated: new Date(2020, 0, 1),
		dateUpdated: undefined,
		dateVisited: undefined,
		entryQuality: 3,
		...overrides,
	};
}
