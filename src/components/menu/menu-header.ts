import type { CollectionEntry } from 'astro:content';

import pMemoize from 'p-memoize';

import type { MenuItem } from '#components/menu/menu-types.ts';

import { getChronologyData } from '#lib/collections/chronology/chronology-data.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { createRegionsByIdsFunction } from '#lib/collections/regions/regions-utils.ts';
import { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { sortByEntryCount } from '#lib/utils/collections.ts';
import { getSiteUrl } from '#lib/utils/routing.ts';

// Increase this to 3 to show subregions in the header menu
const maxDepth = 2 as number;

const t = getTranslations();

function getMenuItemData({
	entry,
	collection,
}: {
	entry: CollectionEntry<'regions' | 'series' | 'themes'>;
	collection: 'regions' | 'series' | 'themes';
}) {
	const ancestor = entry.collection === 'regions' ? entry.data._ancestors?.at(-1) : undefined;

	return {
		collection: entry.collection,
		title: entry.data.title,
		titleMultilingual: getMultilingualContent({ data: entry.data, prop: 'title' })?.primary,
		url: getSiteUrl(`${collection}/${entry.id}`),
		...(ancestor ? { ancestor } : {}),
	};
}

function filterMenuItemEntryCount(depth: 1 | 2 | 3) {
	let minEntryCount: number;

	if (depth === 1) {
		minEntryCount = 5;
	} else if (depth === 2) {
		minEntryCount = 2;
	} else {
		minEntryCount = 8;
	}

	return (entry: CollectionEntry<'regions' | 'series' | 'themes'>) =>
		(entry.data._entryCount ?? 0) >= minEntryCount;
}

async function createMenuHeaderItems(): Promise<Array<MenuItem>> {
	const { entries: regions } = await getRegionsCollection();
	const getRegionsByIds = await createRegionsByIdsFunction();

	const { entries: series } = await getSeriesCollection();
	const { entries: themes } = await getThemesCollection();

	const regionsMenu = regions
		.filter((entry) => entry.data.parent === undefined)
		.filter(filterMenuItemEntryCount(1))
		.sort(sortByEntryCount)
		.slice(0, 12)
		.map((entry) => ({
			...getMenuItemData({ entry, collection: 'regions' }),
			...(entry.data._children && maxDepth > 1
				? {
						children: getRegionsByIds(entry.data._children)
							.filter(filterMenuItemEntryCount(2))
							.sort(sortByEntryCount)
							.slice(0, 15)
							.map((entry) => ({
								...getMenuItemData({ entry, collection: 'regions' }),
								...(entry.data._children && maxDepth > 2
									? {
											children: getRegionsByIds(entry.data._children)
												.filter(filterMenuItemEntryCount(3))
												.sort(sortByEntryCount)
												.slice(0, 8)
												.map((entry) => getMenuItemData({ entry, collection: 'regions' })),
										}
									: {}),
							})),
					}
				: {}),
		}));

	const seriesMenu = series
		.filter((entry) => entry.data.entryQuality >= 2)
		.filter(filterMenuItemEntryCount(1))
		.sort(sortByEntryCount)
		.slice(0, 12)
		.map((entry) => getMenuItemData({ entry, collection: 'series' }));

	const themesMenu = themes
		.filter((entry) => entry.data.entryQuality >= 2)
		.filter(filterMenuItemEntryCount(1))
		.sort(sortByEntryCount)
		.slice(0, 12)
		.map((entry) => getMenuItemData({ entry, collection: 'themes' }));

	const chronologyData = await getChronologyData();

	return [
		{
			title: t('collection.posts.labelPlural'),
			url: getSiteUrl('posts'),
		},
		{
			title: t('collection.locations.labelPlural'),
			url: getSiteUrl('locations'),
		},
		{
			title: 'Regions',
			url: getSiteUrl('regions'),
			children: regionsMenu,
		},
		{
			title: t('collection.series.labelPlural'),
			url: getSiteUrl('series'),
			children: seriesMenu,
		},
		{
			title: t('collection.themes.labelPlural'),
			url: getSiteUrl('themes'),
			children: themesMenu,
		},
		/* @TODO: decide whether to keep notes or not
		{
			title: t('collection.notes.labelPlural'),
			url: getSiteUrl('notes'),
		},
		*/
		{
			title: t('menu.chronology.label'),
			url: getSiteUrl('chronology'),
			children: chronologyData.chronologyYears.slice(0, 12).map((year) => ({
				title: year,
				url: getSiteUrl('chronology', year),
			})),
		},
		{
			title: t('menu.about.label'),
			url: getSiteUrl('about'),
		},
	];
}

export const getMenuHeaderItems = pMemoize(createMenuHeaderItems);
