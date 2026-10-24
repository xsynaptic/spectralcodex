import pMemoize from 'p-memoize';

import type { NavigationItem } from '#components/navigation/navigation-types.ts';
import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import { getNavigationItemUrls } from '#components/navigation/navigation-utils.ts';
import { getPagesCollection } from '#lib/collections/pages/pages-data.ts';
import {
	createRegionsByIdsFunction,
	getRegionsCollection,
} from '#lib/collections/regions/regions-data.ts';
import { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { sortByEntryCount } from '#lib/utils/collections.ts';
import { isListedQuality } from '#lib/utils/content-policy.ts';
import { getSitePath } from '#lib/utils/routing.ts';

// Increase this to 3 to show subregions in the header navigation
const maxDepth = 2 as number;

const t = getTranslations();

async function createNavigationHeaderItems(): Promise<Array<NavigationItem>> {
	const { entries: regions } = await getRegionsCollection();
	const getRegionsByIds = await createRegionsByIdsFunction();

	const { entries: series } = await getSeriesCollection();
	const { entries: themes } = await getThemesCollection();

	const regionsMenu = regions
		.filter((entry) => entry.data.parent === undefined)
		.filter(filterNavigationItemEntryCount(1))
		.toSorted(sortByEntryCount)
		.slice(0, 12)
		.map((entry) => ({
			...getNavigationItemData({ collection: 'regions', entry }),
			...(entry.data._children.length > 0 && maxDepth > 1
				? {
						children: getRegionsByIds(entry.data._children)
							.filter(filterNavigationItemEntryCount(2))
							.toSorted(sortByEntryCount)
							.slice(0, 15)
							.map((entry) => ({
								...getNavigationItemData({ collection: 'regions', entry }),
								...(entry.data._children.length > 0 && maxDepth > 2
									? {
											children: getRegionsByIds(entry.data._children)
												.filter(filterNavigationItemEntryCount(3))
												.toSorted(sortByEntryCount)
												.slice(0, 8)
												.map((entry) => getNavigationItemData({ collection: 'regions', entry })),
										}
									: {}),
							})),
					}
				: {}),
		}));

	const seriesMenu = getNavigationCollectionMenu({ collection: 'series', entries: series });
	const themesMenu = getNavigationCollectionMenu({ collection: 'themes', entries: themes });

	const { entriesMap: pagesMap } = await getPagesCollection();

	const aboutPages = ['faq', 'tech-stack', 'links', 'privacy', 'contact'].flatMap((id) => {
		const entry = pagesMap.get(id);

		return entry ? [{ title: entry.data.title, url: getSitePath(entry.id) }] : [];
	});
	const aboutMenu = [
		{ title: t('navigation.chronology.label'), url: getSitePath('chronology') },
		...aboutPages,
	];

	return [
		{
			title: t('atlas.title'),
			url: getSitePath('atlas'),
		},
		{
			title: t('collection.locations.labelPlural'),
			url: getSitePath('locations'),
		},
		{
			children: regionsMenu,
			title: 'Regions',
			url: getSitePath('regions'),
		},
		{
			title: t('collection.posts.labelPlural'),
			url: getSitePath('posts'),
		},
		{
			children: themesMenu,
			title: t('collection.themes.labelPlural'),
			url: getSitePath('themes'),
		},
		{
			children: seriesMenu,
			title: t('collection.series.labelPlural'),
			url: getSitePath('series'),
		},
		{
			children: aboutMenu,
			title: t('navigation.about.label'),
			url: getSitePath('about'),
		},
	];
}

function filterNavigationItemEntryCount(depth: 1 | 2 | 3) {
	let minEntryCount: number;

	if (depth === 1) {
		minEntryCount = 5;
	} else if (depth === 2) {
		minEntryCount = 2;
	} else {
		minEntryCount = 8;
	}

	return (entry: ComputedEntry<'regions' | 'series' | 'themes'>) =>
		entry.data._entryCount >= minEntryCount;
}

function getNavigationCollectionMenu({
	collection,
	entries,
}: {
	collection: 'series' | 'themes';
	entries: Array<ComputedEntry<'series' | 'themes'>>;
}) {
	return entries
		.filter((entry) => isListedQuality(entry.data))
		.filter(filterNavigationItemEntryCount(1))
		.toSorted(sortByEntryCount)
		.slice(0, 12)
		.map((entry) => getNavigationItemData({ collection, entry }));
}

function getNavigationItemData({
	collection,
	entry,
}: {
	collection: 'regions' | 'series' | 'themes';
	entry: ComputedEntry<'regions' | 'series' | 'themes'>;
}) {
	const ancestor = entry.collection === 'regions' ? entry.data._ancestors.at(-1) : undefined;

	return {
		collection: entry.collection,
		title: entry.data.title,
		titleMultilingual: getMultilingualContent({ data: entry.data, prop: 'title' })?.primary,
		url: getSitePath(`${collection}/${entry.id}`),
		...(ancestor ? { ancestor } : {}),
	};
}

export const getNavigationHeaderItems = pMemoize(createNavigationHeaderItems);

export const getNavigationHeaderUrls = pMemoize(
	async () => new Set(getNavigationItemUrls(await getNavigationHeaderItems())),
);
