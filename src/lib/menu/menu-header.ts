import type { CollectionEntry } from 'astro:content';

import type { MenuItem } from '#lib/types/index.ts';

import { FEATURE_DATE_ARCHIVES } from '#constants.ts';
import { getRegionsCollection } from '#lib/collections/regions/data.ts';
import { getRegionsByIdsFunction } from '#lib/collections/regions/utils.ts';
import { getSeriesCollection } from '#lib/collections/series/data.ts';
import { getThemesCollection } from '#lib/collections/themes/data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getPrimaryMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getTimelineData } from '#lib/timeline/timeline-data.ts';
import { getFilterEntryQualityFunction, sortByContentCount } from '#lib/utils/collections.ts';
import { getSiteUrl } from '#lib/utils/routing.ts';

const t = getTranslations();

function getMenuItemData({
	entry,
	slug,
}: {
	entry: CollectionEntry<'regions' | 'series' | 'themes'>;
	slug: 'regions' | 'series' | 'themes';
}) {
	const ancestor = entry.collection === 'regions' ? entry.data.ancestors?.at(-1) : undefined;

	return {
		collection: entry.collection,
		title: entry.data.title,
		titleMultilingual: getPrimaryMultilingualContent(entry.data, 'title'),
		url: getSiteUrl(`${slug}/${entry.id}`),
		...(ancestor ? { ancestor } : {}),
	};
}

function filterMenuItemContentCount(depth: 1 | 2 | 3) {
	let minContentCount: number;

	if (depth === 1) {
		minContentCount = 5;
	} else if (depth === 2) {
		minContentCount = 2;
	} else {
		minContentCount = 8;
	}

	return (entry: CollectionEntry<'regions' | 'series' | 'themes'>) =>
		(entry.data.postCount ?? 0) + (entry.data.locationCount ?? 0) >= minContentCount;
}

export async function getMenuHeaderItems(): Promise<Array<MenuItem>> {
	const { regions } = await getRegionsCollection();
	const getRegionsByIds = await getRegionsByIdsFunction();

	const { series } = await getSeriesCollection();
	const { themes } = await getThemesCollection();

	const filterEntryQualityFunction = getFilterEntryQualityFunction(2);

	const regionsMenu = regions
		.filter((entry) => entry.data.parent === undefined)
		.filter(filterMenuItemContentCount(1))
		.sort(sortByContentCount)
		.slice(0, 12)
		.map((entry) => ({
			...getMenuItemData({ entry, slug: 'regions' }),
			...(entry.data.children
				? {
						children: getRegionsByIds(entry.data.children)
							.filter(filterMenuItemContentCount(2))
							.sort(sortByContentCount)
							.slice(0, 12)
							.map((entry) => ({
								...getMenuItemData({ entry, slug: 'regions' }),
								...(entry.data.children
									? {
											children: getRegionsByIds(entry.data.children)
												.filter(filterMenuItemContentCount(3))
												.sort(sortByContentCount)
												.slice(0, 8)
												.map((entry) => getMenuItemData({ entry, slug: 'regions' })),
										}
									: {}),
							})),
					}
				: {}),
		}));

	const seriesMenu = series
		.filter(filterEntryQualityFunction)
		.filter(filterMenuItemContentCount(1))
		.sort(sortByContentCount)
		.slice(0, 12)
		.map((entry) => getMenuItemData({ entry, slug: 'series' }));

	const themesMenu = themes
		.filter(filterEntryQualityFunction)
		.filter(filterMenuItemContentCount(1))
		.sort(sortByContentCount)
		.slice(0, 12)
		.map((entry) => getMenuItemData({ entry, slug: 'themes' }));

	const timelineData = await getTimelineData();

	const timelineLatestYear = timelineData.timelineYears.at(0);

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
		...(FEATURE_DATE_ARCHIVES && timelineLatestYear
			? [
					{
						title: t('menu.timeline.label'),
						url: getSiteUrl('timeline', timelineLatestYear),
					},
				]
			: []),
		{
			title: t('menu.about.label'),
			url: getSiteUrl('about'),
		},
	];
}
