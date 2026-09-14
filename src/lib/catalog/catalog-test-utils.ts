import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

// Shared CatalogItem factory for unit tests; pass only the fields a test cares about
export function makeCatalogItem(
	overrides: Partial<CatalogItem> & Pick<CatalogItem, 'collection' | 'id'>,
): CatalogItem {
	return {
		backlinks: new Set<string>(),
		// Local-time constructor (not an ISO string) so date-bucketing tests stay timezone stable
		dateCreated: new Date(2020, 0, 1),
		dateRecorded: undefined,
		dateUpdated: undefined,
		description: undefined,
		entryQuality: 3,
		imageHeroId: undefined,
		imageId: undefined,
		linksExternalCount: undefined,
		locationCount: undefined,
		postCount: undefined,
		regionPrimaryId: undefined,
		title: overrides.id,
		titleMultilingual: undefined,
		url: `/${overrides.id}`,
		wordCount: undefined,
		...overrides,
	};
}
