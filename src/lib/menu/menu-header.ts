import type { MenuItem } from '#lib/menu/menu-types.ts';

import { FEATURE_DATE_ARCHIVES } from '#constants.ts';
import { getRegionsCollection } from '#lib/collections/regions/data.ts';
import { getRegionsByIdsFunction } from '#lib/collections/regions/utils.ts';
import { getSeriesCollection } from '#lib/collections/series/data.ts';
import { getThemesCollection } from '#lib/collections/themes/data.ts';
import { getFilterEntryQualityFunction, sortByContentCount } from '#lib/utils/collections.ts';
import { getTranslations } from '#lib/utils/i18n.ts';
import { getSiteUrl } from '#lib/utils/routing.ts';

const t = getTranslations();

export async function getMenuHeaderItems(): Promise<Array<MenuItem>> {
	const { regions } = await getRegionsCollection();
	const getRegionsByIds = await getRegionsByIdsFunction();

	const { series } = await getSeriesCollection();
	const { themes } = await getThemesCollection();

	const filterEntryQualityFunction = getFilterEntryQualityFunction(2);

	const regionsMenu = regions
		.filter((entry) => entry.data.parent === undefined)
		.sort(sortByContentCount)
		.slice(0, 8)
		.map((entry) => ({
			title: entry.data.title,
			url: getSiteUrl(`regions/${entry.id}`),
			...(entry.data.children
				? {
						children: getRegionsByIds(entry.data.children)
							.sort(sortByContentCount)
							.slice(0, 15)
							.map((entry) => ({
								title: entry.data.title,
								url: getSiteUrl(`regions/${entry.id}`),
							})),
					}
				: {}),
		}));

	const seriesMenu = series
		.filter(filterEntryQualityFunction)
		.sort(sortByContentCount)
		.slice(0, 8)
		.map((entry) => ({
			title: entry.data.title,
			url: getSiteUrl(`series/${entry.id}`),
		}));

	const themesMenu = themes
		.filter(filterEntryQualityFunction)
		.sort(sortByContentCount)
		.slice(0, 12)
		.map((entry) => ({
			title: entry.data.title,
			url: getSiteUrl(`themes/${entry.id}`),
		}));

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
		{
			title: t('collection.ephemera.labelPlural'),
			url: getSiteUrl('ephemera'),
		},
		...(FEATURE_DATE_ARCHIVES
			? [
					{
						title: t('menu.timeline.label'),
						url: getSiteUrl('timeline'),
					},
				]
			: []),
		{
			title: t('menu.about.label'),
			url: getSiteUrl('about'),
		},
	];
}
