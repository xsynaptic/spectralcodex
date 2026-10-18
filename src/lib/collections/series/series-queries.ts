import type { CollectionKey } from 'astro:content';

import * as R from 'remeda';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';
import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { hasFeaturedImage } from '#lib/catalog/catalog-utils.ts';
import { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import { createEntryMapDataFunction } from '#lib/map/map-data.ts';
import { isListedQuality } from '#lib/utils/content-policy.ts';

export async function createQuerySeriesEntryFunction() {
	const { entries: series } = await getSeriesCollection();

	const catalog = await getCatalog();
	const getSeriesCatalogItems = await createSeriesCatalogItemsFunction();
	const getEntryMapData = await createEntryMapDataFunction();

	const seriesCatalogItems = catalog.resolve(series);

	return function querySeriesEntry(entry: ComputedEntry<'series'>) {
		const catalogItems = getSeriesCatalogItems(entry.data.seriesItems);

		if (!catalogItems) return;

		const mapData = getEntryMapData(entry);

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
		entry: ComputedEntry<'series'>;
	}> {
		const entries = series.filter((entry: ComputedEntry<'series'>) =>
			entry.data.seriesItems?.includes(id),
		);

		const results: Array<{
			catalogItems: Array<CatalogItem>;
			entry: ComputedEntry<'series'>;
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
