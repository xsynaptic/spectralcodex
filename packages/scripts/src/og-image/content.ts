import type { ImageFeatured } from '@spectralcodex/shared/schemas';

import {
	ImageFeaturedSchema,
	RegionsSchema,
	ThemesSchema,
	ContentCollectionsEnum,
} from '@spectralcodex/shared/schemas';
import { z } from 'zod';

import type { DataStoreEntry, RegionParentMap } from '../shared/data-store.js';
import type { OpenGraphContentEntry } from './types.js';

import {
	getDataStoreCollection,
	getDataStoreRegionParentsById,
	loadDataStore,
} from '../shared/data-store.js';

/** Strip combining diacritical marks for display font compatibility (e.g. "Shoka" from "Shōka") */
function stripDiacritics(input: string): string {
	return input.normalize('NFD').replaceAll(/[\u0300-\u036F]/g, '');
}

/** Deterministically pick an item from an array based on a string ID */
function pickFrom<T = string>(id: string, options: Array<T>): T {
	if (options.length === 1) return options[0] as T;
	let hash = 0;
	for (let i = 0; i < id.length; i++) hash += id.codePointAt(i) ?? 0;
	return options[hash % options.length] as T;
}

/**
 * Return a fallback image ID based on entry properties
 */
function getFallbackImageId({
	id,
	collection,
	category,
	regions,
	themes,
}: {
	id: string;
	collection: string;
	category?: string | undefined;
	regions?: Array<string> | undefined;
	themes?: Array<string> | undefined;
}): string {
	const regionAncestor = regions?.[0];
	const regionParent = regions?.[1];

	if (collection === ContentCollectionsEnum.Resources) {
		return pickFrom(id, [
			'taiwan/series/suhua-highway-road-trip-2018-19.jpg',
			'taiwan/taichung/qingshui/qingshui-taichung-port-jiande-container-yard-5.jpg',
			'taiwan/taichung/wufeng/wufeng-beigou-forbidden-city-vault-4.jpg',
		]);
	}

	if (themes?.includes('thailand-theaters')) {
		return pickFrom(id, [
			'thailand/bangkok/khlong-san/bangkok-hawaii-cinema-2.jpg',
			'thailand/bangkok/thon-buri/bangkok-dao-khanong-cinema-3.jpg',
		]);
	}
	if (themes?.includes('taiwan-theaters')) {
		return pickFrom(id, [
			'taiwan/tainan/nanxi/nanxi-huazhou-theater-5.jpg',
			'taiwan/taitung/chishang/chishang-wuzhou-theater-1.jpg',
			'taiwan/yunlin/baozhong/baozhong-zicheng-theater-13.jpg',
			'taiwan/yunlin/mailiao/mailiao-jincheng-theater-8.jpg',
		]);
	}
	if (themes?.includes('taiwan-shinto-shrines')) {
		return 'taiwan/tainan/danei/danei-elementary-school-shinto-shrine-1.jpg';
	}
	if (themes?.includes('taiwan-railways')) {
		return 'taiwan/miaoli/zaoqiao/zaoqiao-station-1.jpg';
	}
	if (themes?.includes('taiwan-military-villages')) {
		return pickFrom(id, [
			'taiwan/tainan/rende/tainan-second-air-force-new-village-3.jpg',
			'taiwan/series/nantou-road-trip-2015-1-5.jpg',
		]);
	}
	if (themes?.includes('taiwan-police-history')) {
		return pickFrom(id, ['taiwan/tainan/dongshan/dongshan-niurouqi-police-station-2.jpg']);
	}
	if (themes?.includes('taiwan-sanheyuan')) {
		return 'taiwan/taipei/daan/daan-yifang-old-house-1.jpg';
	}
	if (themes?.includes('taiwan-ghost-island')) {
		return 'taiwan/chiayi/minxiong/minxiong-liu-mansion-6.jpg';
	}
	if (themes?.includes('taiwan-waterworks')) {
		return 'taiwan/chiayi/chiayi-east/chiayi-shuiyuan-water-meter-room-1.jpg';
	}
	if (themes?.includes('alishan-forest-railway')) {
		return 'taiwan/chiayi/zhuqi/zhuqi-jiaoliping-railway-station-1.jpg';
	}
	if (themes?.includes('taiwan-temple-culture')) {
		return 'v/fallback-taiwan-temple-culture-1.jpg';
	}
	if (themes?.includes('taiwan-japanese-colonial-era')) {
		return pickFrom(id, [
			'v/fallback-taiwan-japanese-colonial-era-1.jpg',
			'taiwan/yunlin/douliu/douliu-taiping-old-street-6.jpg',
		]);
	}
	if (themes?.includes('taiwan-qing-dynasty-era')) {
		return 'v/fallback-taiwan-qing-dynasty-era-1.jpg';
	}
	if (themes?.includes('taiwan-urban-exploration')) {
		return pickFrom(id, [
			'taiwan/taipei/xinyi/xinyi-stanton-club-14.jpg',
			'taiwan/changhua/changhua-city/changhua-bus-terminal-3.jpg',
			'taiwan/nantou/shuili/shuili-beipu-post-office-4.jpg',
		]);
	}
	if (regionAncestor === 'taiwan') {
		switch (regionParent) {
			case 'changhua': {
				return 'taiwan/changhua/changhua-city/changhua-confucius-temple-1.jpg';
			}
			case 'chiayi': {
				return 'taiwan/chiayi/chiayi-east/chiayi-sun-shooting-tower-1.jpg';
			}
			case 'hsinchu': {
				return 'taiwan/hsinchu/hsinchu-city/hsinchu-city-god-temple-1.jpg';
			}
			case 'hualien': {
				return pickFrom(id, [
					'taiwan/series/huadong-valley-ride-2018-3-35.jpg',
					'taiwan/series/huadong-valley-ride-2018-4-16.jpg',
				]);
			}
			case 'kaohsiung': {
				return 'taiwan/kaohsiung/hunei/hunei-dahu-tomato-cannery-4.jpg';
			}
			case 'keelung': {
				return 'taiwan/keelung/zhongzheng/keelung-agenna-shipyard-3.jpg';
			}
			// TODO: Kinmen
			// TODO: Lienchiang
			case 'miaoli': {
				return 'taiwan/miaoli/sanyi/sanyi-longteng-broken-bridge-7.jpg';
			}
			case 'nantou': {
				return pickFrom(id, [
					'taiwan/series/nantou-road-trip-2015-1-12.jpg',
					'taiwan/series/nantou-road-trip-2015-2-8.jpg',
				]);
			}
			// TODO: Penghu
			case 'pingtung': {
				return 'taiwan/pingtung/xinpi/xinpi-zhang-family-qinghe-hall-1.jpg';
			}
			case 'taichung': {
				return 'taiwan/taichung/taichung-west/taichung-prefecture-hall-1.jpg';
			}
			case 'tainan': {
				return 'v/fallback-tainan-1.jpg';
			}
			case 'taipei': {
				return 'taiwan/taipei/daan/daan-xinyi-market-1.jpg';
			}
			case 'taitung': {
				return 'taiwan/taitung/chishang/chishang-wuzhou-theater-1.jpg';
			}
			case 'taoyuan': {
				return 'taiwan/taoyuan/longtan/longtan-yeshan-building-3.jpg';
			}
			case 'xinbei': {
				return 'taiwan/xinbei/wanli/wanli-yeliu-signal-station-1.jpg';
			}
			case 'yilan': {
				return pickFrom(id, [
					'taiwan/yilan/datong/datong-jianqing-huaigu-trail-1.jpg',
					'taiwan/series/suhua-highway-road-trip-2018-21.jpg',
				]);
			}
			case 'yunlin': {
				return 'taiwan/yunlin/xiluo/xiluo-bridge-4.jpg';
			}
			default: {
				return 'taiwan/series/huadong-valley-ride-2018-3-35.jpg';
			}
		}
	}
	if (category === 'temple') {
		return 'taiwan/tainan/zuozhen/zuozhen-laojun-temple-1.jpg';
	}
	if (regionAncestor === 'canada') {
		return 'canada/british-columbia/alberni-clayoquot/ucluelet-shorepine-bog-trail-7.jpg';
	}
	if (regionAncestor === 'china') {
		return 'v/fallback-china-1.jpg';
	}
	if (regionAncestor === 'hong-kong') {
		return 'v/fallback-hong-kong-1.jpg';
	}
	if (regionAncestor === 'japan') {
		return 'v/fallback-japan-1.jpg';
	}
	if (regionAncestor === 'malaysia') {
		return 'v/fallback-malaysia-1.jpg';
	}
	if (regionAncestor === 'philippines') {
		return 'v/fallback-philippines-1.jpg';
	}
	if (regionAncestor === 'south-korea') {
		return 'v/fallback-south-korea-1.jpg';
	}
	if (regionAncestor === 'thailand') {
		return 'v/fallback-thailand-1.jpg';
	}
	if (regionAncestor === 'usa') {
		return 'v/fallback-usa-1.jpg';
	}
	if (regionAncestor === 'vietnam') {
		return 'v/fallback-vietnam-1.jpg';
	}
	return pickFrom(id, [
		'v/v-random-1.jpg',
		'taiwan/taichung/qingshui/qingshui-taichung-port-jiande-container-yard-5.jpg',
		'taiwan/series/huadong-valley-ride-2018-3-35.jpg',
	]);
}

/**
 * Featured image handling
 */
function getImageFeaturedId(imageFeatured: ImageFeatured | undefined): string | undefined {
	if (!imageFeatured) return undefined;

	// String: return directly
	if (typeof imageFeatured === 'string') return imageFeatured;

	// Array: get first item
	const firstItem = imageFeatured[0];

	if (!firstItem) return undefined;

	return typeof firstItem === 'object' && 'id' in firstItem ? firstItem.id : firstItem;
}

function getImageFeaturedData({
	entry,
	collection,
	regionParentMap,
}: {
	entry: DataStoreEntry;
	collection: string;
	regionParentMap?: RegionParentMap;
}): { imageFeaturedId: string; isFallback: boolean } {
	const imageFeatured = ImageFeaturedSchema.optional().parse(entry.data.imageFeatured);

	const imageFeaturedId = getImageFeaturedId(imageFeatured);

	if (imageFeaturedId) return { imageFeaturedId, isFallback: false };

	return {
		imageFeaturedId: getFallbackImageId({
			id: entry.id,
			collection,
			category: z.string().optional().parse(entry.data.category),
			regions: regionParentMap
				? getDataStoreRegionParentsById(
						collection === ContentCollectionsEnum.Regions
							? z.string().optional().parse(entry.data.parent)
							: RegionsSchema.optional().parse(entry.data.regions)?.[0],
						regionParentMap,
					)
				: undefined,
			themes: ThemesSchema.optional().parse(entry.data.themes),
		}),
		isFallback: true,
	};
}

/**
 * Index page entries (collection landing pages)
 */
function getIndexEntries(): Array<OpenGraphContentEntry> {
	const indexes = [
		{
			id: ContentCollectionsEnum.Archives,
			title: 'Archives',
			imageFeaturedId: 'taiwan/keelung/renai/keelung-renwu-road-pedestrian-bridge-2.jpg',
			isFallback: true,
		},
		{
			id: ContentCollectionsEnum.Ephemera,
			title: 'Ephemera',
			imageFeaturedId: 'taiwan/miaoli/tongxiao/tongxiao-railway-granary-complex-3.jpg',
			isFallback: true,
		},
		{
			id: ContentCollectionsEnum.Locations,
			title: 'Locations',
			imageFeaturedId: 'taiwan/yunlin/xiluo/xiluo-theater-21.jpg',
			isFallback: true,
		},
		{
			id: ContentCollectionsEnum.Posts,
			title: 'Posts',
			isFallback: true,
		},
		{
			id: ContentCollectionsEnum.Regions,
			title: 'Regions',
			imageFeaturedId: 'taiwan/series/nantou-road-trip-2015-5-17.jpg',
		},
		{
			id: ContentCollectionsEnum.Resources,
			title: 'Resources',
			isFallback: true,
		},
		{
			id: ContentCollectionsEnum.Series,
			title: 'Series',
			isFallback: true,
		},
		{
			id: ContentCollectionsEnum.Themes,
			title: 'Themes',
			isFallback: true,
		},
		{
			id: 'homepage',
			title: '', // No duplicate branding
			imageFeaturedId: 'taiwan/series/huadong-valley-ride-2018-4-9.jpg',
		},
		{
			id: 'not-found',
			title: '404: Not Found',
			isFallback: true,
		},
	];

	return indexes.map(({ id, title, imageFeaturedId, isFallback }) => ({
		id: `index-${id}`,
		collection: 'index',
		digest: `index-${id}`,
		title,
		imageFeaturedId: imageFeaturedId ?? 'taiwan/yunlin/mailiao/mailiao-jincheng-theater-8.jpg',
		isFallback: isFallback ?? false,
	}));
}

/**
 * Archives handling
 */
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

function getArchivesTitle(id: string): string {
	const year = Number(id.split('-')[0]);
	const month = Number(id.split('-')[1]);

	return `Archives: ${monthFormatter.format(new Date(year, month - 1))} ${String(year)}`;
}

// Archive generation starts from this year
const ARCHIVES_YEAR_START = 2004;

function getArchiveEntries(): Array<OpenGraphContentEntry> {
	const entries: Array<OpenGraphContentEntry> = [];
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;
	const collection = ContentCollectionsEnum.Archives;

	for (let year = ARCHIVES_YEAR_START; year <= currentYear; year++) {
		const id = String(year);

		// Yearly entries
		entries.push({
			id,
			collection,
			digest: `${collection}-${id}`,
			title: `Archives: ${id}`,
			imageFeaturedId: getFallbackImageId({
				id,
				collection,
			}),
			isFallback: true,
		});

		// Monthly entries
		const maxMonth = year === currentYear ? currentMonth : 12;

		for (let month = 1; month <= maxMonth; month++) {
			const id = `${String(year)}-${String(month).padStart(2, '0')}`;

			entries.push({
				id,
				collection,
				digest: `${collection}-${id}`,
				title: getArchivesTitle(id),
				imageFeaturedId: getFallbackImageId({
					id,
					collection,
				}),
				isFallback: true,
			});
		}
	}

	return entries;
}

/**
 * Content entries are constructed with enough metadata to assign fallback images
 */
export function getContentEntries(dataStorePath: string): Array<OpenGraphContentEntry> {
	const { collections, regionParentMap } = loadDataStore(dataStorePath);

	const entriesMap = new Map<string, OpenGraphContentEntry>();

	for (const entry of getArchiveEntries()) {
		entriesMap.set(entry.id, entry);
	}

	for (const entry of getIndexEntries()) {
		entriesMap.set(entry.id, entry);
	}

	for (const collection of Object.values(ContentCollectionsEnum)) {
		const collectionEntries = getDataStoreCollection(collections, collection);

		for (const entry of collectionEntries) {
			const id = entry.id.replace('/', '-');
			const titleRaw = z.string().optional().parse(entry.data.title);

			let title = titleRaw;

			// Skip entries without digest
			if (!entry.digest) continue;

			if (collection === ContentCollectionsEnum.Archives) {
				title = getArchivesTitle(id);
			} else if (collection === ContentCollectionsEnum.Resources) {
				if (!('showPage' in entry.data) || !entry.data.showPage || !title) {
					continue;
				}
				// TODO: taking up too much space; title = `Resources: ${title}`;
			} else if (!title) {
				continue;
			}

			const imageFeaturedData = getImageFeaturedData({ entry, collection, regionParentMap });

			entriesMap.set(id, {
				collection,
				id,
				digest: entry.digest,
				title: stripDiacritics(title),
				titleZh: z.string().optional().parse(entry.data.title_zh),
				titleJa: z.string().optional().parse(entry.data.title_ja),
				titleTh: z.string().optional().parse(entry.data.title_th),
				...imageFeaturedData,
			});
		}
	}

	return [...entriesMap.values()];
}
