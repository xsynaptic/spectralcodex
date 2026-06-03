import * as R from 'remeda';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import {
	filterHasFeaturedImage,
	sortCatalogByDate,
	sortCatalogByQuality,
} from '#lib/catalog/catalog-utils.ts';

export async function queryIndexData() {
	const catalog = await getCatalog();

	return {
		featuredCatalogItems: R.pipe(
			catalog.byCollection('locations', 'posts'),
			R.filter((item) => item.entryQuality >= 4),
			R.filter(filterHasFeaturedImage),
			R.shuffle(),
			R.take(5),
		),
		recentCatalogItems: R.pipe(
			catalog.byCollection('locations', 'posts'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(filterHasFeaturedImage),
			R.sort(sortCatalogByDate),
			R.take(16),
		),
		seriesCatalogItems: R.pipe(
			catalog.byCollection('series'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(filterHasFeaturedImage),
			R.sort(sortCatalogByQuality),
			R.take(4),
		),
		themesCatalogItems: R.pipe(
			catalog.byCollection('themes'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(filterHasFeaturedImage),
			R.sort(sortCatalogByQuality),
			R.take(8),
		),
	};
}
