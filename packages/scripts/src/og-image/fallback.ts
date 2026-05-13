import { ContentCollectionsEnum } from '@spectralcodex/shared/schemas';

/**
 * Deterministically pick an item from an array based on a string ID
 */
function pickFrom<T = string>(id: string, options: Array<T>): T {
	if (options.length === 1) return options[0] as T;

	let hash = 0;

	for (let i = 0; i < id.length; i++) hash += id.codePointAt(i) ?? 0;

	return options[hash % options.length] as T;
}

/**
 * Return a fallback image ID based on entry properties
 */
export function getFallbackImageId({
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
		return 'taiwan/tainan/rende/tainan-second-air-force-new-village-3.jpg';
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
				return 'taiwan/nantou/puli/puli-guanyin-suspension-bridge-1.jpg';
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

export const staticFallbackImageIds = {
	[ContentCollectionsEnum.Archives]:
		'taiwan/keelung/renai/keelung-renwu-road-pedestrian-bridge-2.jpg',
	[ContentCollectionsEnum.Notes]: 'taiwan/miaoli/tongxiao/tongxiao-railway-granary-complex-3.jpg',
	[ContentCollectionsEnum.Locations]: 'taiwan/yunlin/xiluo/xiluo-theater-21.jpg',
	[ContentCollectionsEnum.Regions]:
		'taiwan/taichung/qingshui/qingshui-taichung-port-jiande-container-yard-1.jpg',
	homepage: 'taiwan/series/huadong-valley-ride-2018-3-35.jpg',
	default: 'taiwan/yunlin/mailiao/mailiao-jincheng-theater-8.jpg',
} as const;
