import type { ImageFeatured } from '@spectralcodex/shared/schemas';

import {
	ImageFeaturedSchema,
	RegionsSchema,
	ThemesSchema,
	ContentCollectionsEnum,
} from '@spectralcodex/shared/schemas';
import { z } from 'zod';

import type { OpenGraphMetadataItem } from './types.js';

import {
	getDataStoreCollection,
	getDataStoreRegionParentsById,
	loadDataStore,
} from '../content-utils/data-store.js';

interface ContentEntry extends OpenGraphMetadataItem {
	digest: string;
	imageFeaturedId: string;
}

/** Deterministically pick an item from an array based on a string ID */
function pickFrom<T = string>(id: string, options: Array<T>): T {
	if (options.length === 1) return options[0] as T;
	let hash = 0;
	for (let i = 0; i < id.length; i++) hash += id.codePointAt(i) ?? 0;
	return options[hash % options.length] as T;
}

/**
 * Returns a fallback image ID based on entry properties
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

	if (collection === 'resources') {
		return 'v/v-random-1.jpg';
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
		]);
	}
	if (themes?.includes('taiwan-shinto-shrines')) {
		return 'taiwan/tainan/danei/danei-elementary-school-shinto-shrine-1.jpg';
	}
	if (themes?.includes('taiwan-railways')) {
		return 'taiwan/miaoli/zaoqiao/zaoqiao-station-1.jpg';
	}
	if (themes?.includes('taiwan-military-villages')) {
		return 'taiwan/tainan/rende/tainan-second-air-force-new-village-3.jpg';
	}
	if (themes?.includes('taiwan-japanese-colonial-era')) {
		return 'v/fallback-taiwan-japanese-colonial-era-1.jpg';
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
				return 'taiwan/series/huadong-valley-ride-2018-3-35.jpg';
			}
			case 'kaohsiung': {
				return 'taiwan/kaohsiung/hunei/hunei-dahu-tomato-cannery-4.jpg';
			}
			case 'keelung': {
				return 'taiwan/keelung/zhongzheng/keelung-agenna-shipyard-3.jpg';
			}
			// TODO: Lienchiang
			case 'miaoli': {
				return 'taiwan/miaoli/sanyi/sanyi-longteng-broken-bridge-7.jpg';
			}
			case 'nantou': {
				return 'taiwan/series/nantou-road-trip-2015-1-12.jpg';
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
				return 'taiwan/taipai/daan/daan-xinyi-market-1.jpg';
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
				return 'taiwan/yilan/datong/datong-jianqing-huaigu-trail-1.jpg';
			}
			case 'yunlin': {
				return 'taiwan/yunlin/xiluo/xiluo-bridge-4.jpg';
			}
			default: {
				return 'taiwan/series/nantou-road-trip-2015-2-14.jpg';
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
	]);
}

function getImageFeaturedId(imageFeatured: ImageFeatured | undefined): string | undefined {
	if (!imageFeatured) return undefined;

	if (Array.isArray(imageFeatured)) return getImageFeaturedId(imageFeatured[0]);

	return typeof imageFeatured === 'object' && 'id' in imageFeatured
		? imageFeatured.id
		: imageFeatured;
}

// Content entries are constructed with enough metadata to assign fallback images
export function getContentEntries(dataStorePath: string): Array<ContentEntry> {
	const { collections, regionParentMap } = loadDataStore(dataStorePath);

	const allEntries: Array<ContentEntry> = [];

	for (const collection of Object.values(ContentCollectionsEnum)) {
		const collectionEntries = getDataStoreCollection(collections, collection);

		for (const entry of collectionEntries) {
			const id = entry.id.replace('/', '-');
			const titleRaw = z.string().optional().parse(entry.data.title);
			const imageFeatured = ImageFeaturedSchema.optional().parse(entry.data.imageFeatured);
			const imageFeaturedId = getImageFeaturedId(imageFeatured);

			// Skip entries without digest
			if (!titleRaw || !entry.digest) continue;

			let title = titleRaw;

			if (collection === 'resources') {
				title = `Resources: ${titleRaw}`;
			}

			allEntries.push({
				collection,
				id,
				digest: entry.digest,
				title,
				titleZh: z.string().optional().parse(entry.data.title_zh),
				titleJa: z.string().optional().parse(entry.data.title_ja),
				titleTh: z.string().optional().parse(entry.data.title_th),
				imageFeaturedId:
					imageFeaturedId ??
					getFallbackImageId({
						id: entry.id,
						collection,
						category: z.string().optional().parse(entry.data.category),
						regions: getDataStoreRegionParentsById(
							collection === 'regions'
								? z.string().optional().parse(entry.data.parent)
								: RegionsSchema.optional().parse(entry.data.regions)?.[0],
							regionParentMap,
						),
						themes: ThemesSchema.optional().parse(entry.data.themes),
					}),
				isFallback: imageFeaturedId === undefined,
			});
		}
	}

	return allEntries;
}
