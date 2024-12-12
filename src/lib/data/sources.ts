import type { SourceItemInput } from '@/lib/schemas/sources';

// Commonly cited sources
export const sourcesMap = {
	'chiayi-city-old-theater-tour': {
		title: 'Chiayi City Old Theater Tour',
		titleAlt: '嘉義市老戲院踏查誌',
		links: [
			{
				title: 'Takaobooks',
				url: 'https://www.takaobooks.tw/news-info.asp?id=450',
			},
		],
	},
	'dachen-new-village-demographics': {
		title: 'Dachen New Village Demographics',
		titleAlt: '大陳新村各地區人口分佈及職業概況',
		links: [
			{
				title: 'Dachen Social Culture Network (追尋大陳社會文化網)',
				url: 'https://www2.ios.sinica.edu.tw/dachen/habitanttable.htm',
			},
		],
	},
	'gold-museum-report': {
		title: 'New Taipei Gold Museum Report: In Search of Old Theaters',
		titleAlt: '新北市立黃金博物館「尋找老戲院身影」',
		description:
			'A report commissioned by the New Taipei Gold Museum and published in 2019. It was overseen by Xu Shengfa (許勝發) at the National Taipei University of the Arts.',
		publisher: 'Hsinchu Municipal Cultural Center (新竹市立文化中心)',
		links: ['https://tm.ncl.edu.tw/article?u=022_001_00000967'],
	},
	'hsinchu-city-theater-catalog': {
		title: 'Fengcheng Film Talk: Catalog of major film and theater events in Hsinchu City',
		titleAlt: '風城影話：新竹市電影、戲院大事圖錄',
		links: ['https://tm.ncl.edu.tw/article?u=022_002_00001050&lang=chn'],
	},
	'hsinchu-city-theater-chronicles': {
		title: 'Hsinchu City Theater Chronicles',
		titleAlt: '新竹市戲院誌',
		datePublished: '1996',
		publisher: 'Hsinchu Municipal Cultural Center (新竹市立文化中心)',
		links: ['https://tm.ncl.edu.tw/article?u=022_001_00000967'],
	},
	'hsinchu-county-old-theater-overview': {
		title: 'Hsinchu County Old Theater Overview',
		titleAlt: '新竹縣老戲院面面觀',
	},
	incarnation: {
		title: 'Incarnation',
		titleAlt: '巨神連線',
		authors: ['Yao Jui-Chung (姚瑞中)'],
		publisher: '典藏藝術家庭',
		datePublished: '2017',
	},
	mirage: {
		title: 'Mirage: Disused Public Property in Taiwan',
		authors: ['Yao Jui-Chung (姚瑞中)', 'Lost Society Document (失落社會檔案室)'],
		publisher: 'Garden City Publishing (Taipei, Taiwan)',
		datePublished: '2016',
		links: [
			{
				title: 'Lostgens',
				url: 'https://lostgens.org/mirage-disused-public-property/',
			},
			{
				title: 'Taipei Times',
				url: 'https://www.taipeitimes.com/News/feat/archives/2016/03/16/2003641677',
			},
		],
	},
	'nanying-theater-chronicles': {
		title: 'Nanying Theater Chronicles',
		titleAlt: '南瀛戲院誌',
		publisher: 'Tainan County Government (臺南縣政府)',
		datePublished: '2009',
		links: [
			'https://tm.ncl.edu.tw/article?u=022_005_00004780&lang=chn',
			{
				title: '文創plus-臺南創意中心',
				url: 'https://publications.culture.tainan.gov.tw/index.php?option=product&lang=cht&task=pageinfo&id=739&belongid=624&index=36',
			},
		],
	},
	'parasitic-temples': {
		title: 'Parasitic Temples',
		titleAlt: '寄生之廟：台灣都市夾縫中的街廟觀察，適應社會變遷的常民空間圖鑑',
		authors: ['Lai Po-Wei (賴伯威)'],
		publisher: '野人',
		datePublished: '2017',
		links: [
			{
				title: 'Willopedia',
				url: 'https://www.facebook.com/willipodia/',
			},
		],
	},
	'taiwan-drama-history': {
		title: 'Chen Chengsan and Gongyue Club: A case study in the history of Taiwanese drama',
		titleAlt: '陳澄三與拱樂社: 台灣戲劇史的一個硏究個案',
		authors: ['Qiu Kunliang (邱坤良)'],
		datePublished: '2001',
		publisher: 'National Center For Traditional Arts (國立傳統藝術中心)',
	},
	'taiwan-general-guide': {
		title: 'Taiwan General Guide',
		titleAlt: '台灣通覽',
		description:
			'Published by Ta-Hwa Evening News (大華晚報社) in 1960, the Taiwan General Guide was a comprehensive guidebook to Taiwan, including a section on theaters.',
	},
	'the-thief-of-places': {
		title: 'The Thief of Places', // Temporary, should reference specific posts
	},
} as const satisfies Record<string, SourceItemInput>;
