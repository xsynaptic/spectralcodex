import * as R from 'remeda';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

// Cap on the shuffled "more from this entry" sample shown on region/theme entry pages
const RELATED_CATALOG_ITEMS_LIMIT = 25;

export function sortCatalogByDate(a: CatalogItem, b: CatalogItem): number {
	return (b.dateUpdated ?? b.dateCreated).valueOf() - (a.dateUpdated ?? a.dateCreated).valueOf();
}

// Highest quality first, newest first on ties
export function sortCatalogByQuality(a: CatalogItem, b: CatalogItem): number {
	return b.entryQuality - a.entryQuality || sortCatalogByDate(a, b);
}

export function filterHasFeaturedImage(item: CatalogItem): boolean {
	return !!item.imageId;
}

/**
 * Split an entry's related items into a featured set and a shuffled remainder.
 * Featured = items with a featured image, newest first. The remainder is everything
 * in `rest` not already featured, shuffled and capped; the count is the full remainder size.
 */
export function buildEntryCatalogItems(
	featured: ReadonlyArray<CatalogItem>,
	rest: ReadonlyArray<CatalogItem>,
	limit = RELATED_CATALOG_ITEMS_LIMIT,
): {
	catalogItemsFiltered: Array<CatalogItem>;
	catalogItems: Array<CatalogItem>;
	catalogItemsCount: number;
} {
	const catalogItemsFiltered = R.pipe(
		featured,
		R.filter(filterHasFeaturedImage),
		R.sort(sortCatalogByDate),
	);

	const featuredIds = new Set(catalogItemsFiltered.map((item) => item.id));

	const catalogItemsAll = R.pipe(
		rest,
		R.filter((item) => !featuredIds.has(item.id)),
		R.shuffle(),
	);

	return {
		catalogItemsFiltered,
		catalogItems: catalogItemsAll.slice(0, limit),
		catalogItemsCount: catalogItemsAll.length,
	};
}
