import * as R from 'remeda';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import {
	hasFeaturedImage,
	hasHighResolutionHeroImage,
	sortCatalogByDate,
	sortCatalogByEntryQuality,
} from '#lib/catalog/catalog-utils.ts';

export async function queryHomeData() {
	const catalog = await getCatalog();

	return {
		featuredCatalogItems: R.pipe(
			catalog.byCollection('locations', 'posts'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(hasHighResolutionHeroImage),
			R.shuffle(),
			R.take(5),
		),
		recentCatalogItems: R.pipe(
			catalog.byCollection('locations', 'posts'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(hasFeaturedImage),
			R.sort(sortCatalogByDate),
			R.take(16),
		),
		seriesCatalogItems: R.pipe(
			catalog.byCollection('series'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(hasFeaturedImage),
			R.sort(sortCatalogByEntryQuality),
			R.take(4),
		),
		themesCatalogItems: R.pipe(
			catalog.byCollection('themes'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(hasFeaturedImage),
			R.sort(sortCatalogByEntryQuality),
			R.take(8),
		),
	};
}
