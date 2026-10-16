import type { CollectionEntry, CollectionKey } from 'astro:content';

import * as R from 'remeda';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { hasFeaturedImage } from '#lib/catalog/catalog-utils.ts';
import { createLocationsBySeriesFunction } from '#lib/collections/locations/locations-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-data.ts';
import { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getLocationsMapRule } from '#lib/map/map-locations.ts';
import { isListedQuality } from '#lib/utils/content-policy.ts';

export async function createQuerySeriesEntryFunction() {
	const { entries: series } = await getSeriesCollection();

	const catalog = await getCatalog();
	const getSeriesCatalogItems = await createSeriesCatalogItemsFunction();
	const getSeriesLocations = await createLocationsBySeriesFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const getMapData = await createMapDataFunction();

	const seriesCatalogItems = catalog.resolve(series);

	return function querySeriesEntry(entry: CollectionEntry<'series'>) {
		const catalogItems = getSeriesCatalogItems(entry.data.seriesItems);

		if (!catalogItems) return;

		const seriesLocations = getSeriesLocations(entry.data.seriesItems);
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			rule: getLocationsMapRule(seriesLocations),
			...getMapLanguages(regionPrimary?.data._langCode),
		});

		const wordCount = seriesCatalogItems.find((item) => item.id === entry.id)?.wordCount;

		return { catalogItems, mapData, wordCount };
	};
}

export async function createSeriesByEntryFunction() {
	const { entries: series } = await getSeriesCollection();

	const getSeriesCatalogItems = await createSeriesCatalogItemsFunction();

	return function getSeriesByEntry({
		collection,
		id,
	}: {
		collection: Extract<CollectionKey, 'locations' | 'posts'>;
		id: string;
	}): Array<{
		catalogItems: Array<CatalogItem>;
		entry: CollectionEntry<'series'>;
	}> {
		const entries = series.filter((entry: CollectionEntry<'series'>) =>
			entry.data.seriesItems?.includes(id),
		);

		const results: Array<{
			catalogItems: Array<CatalogItem>;
			entry: CollectionEntry<'series'>;
		}> = [];

		for (const entry of entries) {
			const catalogItems = getSeriesCatalogItems(entry.data.seriesItems);

			if (catalogItems?.some((item) => item.id === id && item.collection === collection)) {
				results.push({ catalogItems, entry });
			}
		}
		return results;
	};
}

export async function querySeriesIndex() {
	const { entries: series } = await getSeriesCollection();

	const catalog = await getCatalog();

	return R.pipe(
		series,
		R.filter((entry) => isListedQuality(entry.data)),
		R.sort((a, b) =>
			a.data.seriesItems && b.data.seriesItems
				? b.data.seriesItems.length - a.data.seriesItems.length
				: 0,
		),
		catalog.resolve,
	);
}

async function createSeriesCatalogItemsFunction() {
	const catalog = await getCatalog();

	return function getSeriesCatalogItems(
		ids: Array<string> | undefined,
	): Array<CatalogItem> | undefined {
		if (!ids || ids.length === 0) return;

		return ids
			.map((id) => catalog.getById(id))
			.filter((entry) => !!entry)
			.filter(hasFeaturedImage);
	};
}
