/**
 * Deterministically pick an item from an array based on a string ID
 */
function pickFrom(id: string, options: ReadonlyArray<string>): string {
	if (options.length === 1) return options[0]!;

	let hash = 0;

	for (let i = 0; i < id.length; i++) hash += id.codePointAt(i) ?? 0;

	return options[hash % options.length]!;
}

/**
 * Single source of truth for fallback image IDs
 * Consumed by media-orphans and og-image scripts
 */
export const fallbackImageIds: Record<string, string | ReadonlyArray<string>> = {
	// Collections
	archives: 'taiwan/keelung/renai/keelung-renwu-road-pedestrian-bridge-2.jpg',
	notes: 'taiwan/miaoli/tongxiao/tongxiao-railway-granary-complex-3.jpg',
	locations: 'taiwan/yunlin/xiluo/xiluo-theater-21.jpg',
	regions: 'taiwan/taichung/qingshui/qingshui-taichung-port-jiande-container-yard-1.jpg',
	resources: [
		'taiwan/series/suhua-highway-road-trip-2018-19.jpg',
		'taiwan/taichung/qingshui/qingshui-taichung-port-jiande-container-yard-5.jpg',
		'taiwan/taichung/wufeng/wufeng-beigou-forbidden-city-vault-4.jpg',
	],

	// Themes
	'thailand-theaters': [
		'thailand/bangkok/khlong-san/bangkok-hawaii-cinema-2.jpg',
		'thailand/bangkok/thon-buri/bangkok-dao-khanong-cinema-3.jpg',
	],
	'taiwan-theaters': [
		'taiwan/tainan/nanxi/nanxi-huazhou-theater-5.jpg',
		'taiwan/taitung/chishang/chishang-wuzhou-theater-1.jpg',
		'taiwan/yunlin/baozhong/baozhong-zicheng-theater-13.jpg',
		'taiwan/yunlin/mailiao/mailiao-jincheng-theater-8.jpg',
	],
	'taiwan-shinto-shrines': 'taiwan/tainan/danei/danei-elementary-school-shinto-shrine-1.jpg',
	'taiwan-railways': 'taiwan/miaoli/zaoqiao/zaoqiao-station-1.jpg',
	'taiwan-military-villages': 'taiwan/tainan/rende/tainan-second-air-force-new-village-3.jpg',
	'taiwan-police-history': 'taiwan/tainan/dongshan/dongshan-niurouqi-police-station-2.jpg',
	'taiwan-sanheyuan': 'taiwan/taipei/daan/daan-yifang-old-house-1.jpg',
	'taiwan-ghost-island': 'taiwan/chiayi/minxiong/minxiong-liu-mansion-6.jpg',
	'taiwan-waterworks': 'taiwan/chiayi/chiayi-east/chiayi-shuiyuan-water-meter-room-1.jpg',
	'alishan-forest-railway': 'taiwan/chiayi/zhuqi/zhuqi-jiaoliping-railway-station-1.jpg',
	'taiwan-temple-culture': 'v/fallback-taiwan-temple-culture-1.jpg',
	'taiwan-japanese-colonial-era': [
		'v/fallback-taiwan-japanese-colonial-era-1.jpg',
		'taiwan/yunlin/douliu/douliu-taiping-old-street-6.jpg',
	],
	'taiwan-qing-dynasty-era': 'v/fallback-taiwan-qing-dynasty-era-1.jpg',
	'taiwan-urban-exploration': [
		'taiwan/taipei/xinyi/xinyi-stanton-club-14.jpg',
		'taiwan/changhua/changhua-city/changhua-bus-terminal-3.jpg',
		'taiwan/nantou/shuili/shuili-beipu-post-office-4.jpg',
	],

	// Categories
	temple: 'taiwan/tainan/zuozhen/zuozhen-laojun-temple-1.jpg',

	// Regions
	'taiwan/changhua': 'taiwan/changhua/changhua-city/changhua-confucius-temple-1.jpg',
	'taiwan/chiayi': 'taiwan/chiayi/chiayi-east/chiayi-sun-shooting-tower-1.jpg',
	'taiwan/hsinchu': 'taiwan/hsinchu/hsinchu-city/hsinchu-city-god-temple-1.jpg',
	'taiwan/hualien': [
		'taiwan/series/huadong-valley-ride-2018-3-35.jpg',
		'taiwan/series/huadong-valley-ride-2018-4-16.jpg',
	],
	'taiwan/kaohsiung': 'taiwan/kaohsiung/hunei/hunei-dahu-tomato-cannery-4.jpg',
	'taiwan/keelung': 'taiwan/keelung/zhongzheng/keelung-agenna-shipyard-3.jpg',
	'taiwan/miaoli': 'taiwan/miaoli/sanyi/sanyi-longteng-broken-bridge-7.jpg',
	'taiwan/nantou': 'taiwan/nantou/puli/puli-guanyin-suspension-bridge-1.jpg',
	'taiwan/pingtung': 'taiwan/pingtung/xinpi/xinpi-zhang-family-qinghe-hall-1.jpg',
	'taiwan/taichung': 'taiwan/taichung/taichung-west/taichung-prefecture-hall-1.jpg',
	'taiwan/tainan': 'v/fallback-tainan-1.jpg',
	'taiwan/taipei': 'taiwan/taipei/daan/daan-xinyi-market-1.jpg',
	'taiwan/taitung': 'taiwan/taitung/chishang/chishang-wuzhou-theater-1.jpg',
	'taiwan/taoyuan': 'taiwan/taoyuan/longtan/longtan-yeshan-building-3.jpg',
	'taiwan/xinbei': 'taiwan/xinbei/wanli/wanli-yeliu-signal-station-1.jpg',
	'taiwan/yilan': [
		'taiwan/yilan/datong/datong-jianqing-huaigu-trail-1.jpg',
		'taiwan/series/suhua-highway-road-trip-2018-21.jpg',
	],
	'taiwan/yunlin': 'taiwan/yunlin/xiluo/xiluo-bridge-4.jpg',
	taiwan: 'taiwan/series/huadong-valley-ride-2018-3-35.jpg',
	canada: 'canada/british-columbia/alberni-clayoquot/ucluelet-shorepine-bog-trail-7.jpg',
	china: 'v/fallback-china-1.jpg',
	'hong-kong': 'v/fallback-hong-kong-1.jpg',
	japan: 'v/fallback-japan-1.jpg',
	malaysia: 'v/fallback-malaysia-1.jpg',
	philippines: 'v/fallback-philippines-1.jpg',
	'south-korea': 'v/fallback-south-korea-1.jpg',
	thailand: 'v/fallback-thailand-1.jpg',
	usa: 'v/fallback-usa-1.jpg',
	vietnam: 'v/fallback-vietnam-1.jpg',

	// Specials
	homepage: 'taiwan/series/huadong-valley-ride-2018-3-35.jpg',
	default: [
		'v/v-random-1.jpg',
		'taiwan/taichung/qingshui/qingshui-taichung-port-jiande-container-yard-5.jpg',
		'taiwan/series/huadong-valley-ride-2018-3-35.jpg',
		'taiwan/yunlin/mailiao/mailiao-jincheng-theater-8.jpg',
	],
};

/**
 * Resolve a fallback image ID by key, with deterministic pick for arrays
 * Falls back to the `default` key if the requested key is missing
 */
export function resolveFallbackImageId(key: string, id: string): string {
	const value = fallbackImageIds[key] ?? fallbackImageIds.default;

	if (typeof value === 'string') return value;

	return pickFrom(id, value!);
}

/**
 * Return a fallback image ID based on entry properties
 * Priority: collection → themes → region (ancestor/parent) → category → region (ancestor) → default
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

	if (collection === 'resources') {
		return resolveFallbackImageId('resources', id);
	}

	const themePriority = [
		'thailand-theaters',
		'taiwan-theaters',
		'taiwan-shinto-shrines',
		'taiwan-railways',
		'taiwan-military-villages',
		'taiwan-police-history',
		'taiwan-sanheyuan',
		'taiwan-ghost-island',
		'taiwan-waterworks',
		'alishan-forest-railway',
		'taiwan-temple-culture',
		'taiwan-japanese-colonial-era',
		'taiwan-qing-dynasty-era',
		'taiwan-urban-exploration',
	];

	if (themes) {
		for (const theme of themePriority) {
			if (themes.includes(theme)) return resolveFallbackImageId(theme, id);
		}
	}

	if (regionAncestor === 'taiwan') {
		const parentKey = regionParent ? `taiwan/${regionParent}` : undefined;

		if (parentKey && parentKey in fallbackImageIds) {
			return resolveFallbackImageId(parentKey, id);
		}

		return resolveFallbackImageId('taiwan', id);
	}

	if (category === 'temple') return resolveFallbackImageId('temple', id);

	if (regionAncestor && regionAncestor in fallbackImageIds) {
		return resolveFallbackImageId(regionAncestor, id);
	}

	return resolveFallbackImageId('default', id);
}
