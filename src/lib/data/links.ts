// Commonly linked domains
// Note: we're using an array of tuples since sources may repeat with different URL fragments

import type { TitleMultilingual } from '#lib/i18n/i18n-schemas.ts';

// cSpell:disable -- Too many proper names in this file
interface LinksMapItem extends TitleMultilingual {
	title: string;
	match: string;
}

export const linksMap = [
	{
		title: 'Just A Balcony',
		match: 'justabalcony.blogspot.', // Both .com and .tw in use
	},
	{
		title: 'Wild Land Travel',
		title_zh: '-地球上的火星人-下巴 (野地旅)',
		match: 'theericel.blogspot.',
	},
	{
		title: `Shepherd's Wolf`,
		title_zh: '放羊的狼',
		match: 'ivynimay.blogspot.',
	},
	{
		title: 'The Thief of Places',
		match: 'thiefplaces.com',
	},
	{
		title: 'Tony Huang',
		match: 'tonyhuang39.com',
	},
	{
		title: 'Josh Ellis Photography',
		match: 'www.goteamjosh.com',
	},
	{
		title: 'Formosa Ex',
		match: 'formosajmac.com',
	},
	{
		title: 'Tom Rook Art',
		match: 'tomrookart.com',
	},
	{
		title: 'CW Hung',
		title_zh: '飛行場の測候所',
		match: 'cwhung.blogspot.',
	},
	{
		title: 'Taiwan Air Power',
		match: 'taiwanairpower.org',
	},
	{
		title: 'Taiwan Air Power',
		match: 'taiwanairblog.blogspot.',
	},
	{
		title: 'Taipei Air Station',
		match: 'taipeiairstation.com',
	},
	{
		title: 'Japanese Gods Who Came To Taiwan',
		title_ja: '台湾に渡った日本の神々',
		match: 'blog.goo.ne.jp/jinjya_taiwan',
	},
	{
		title: 'Taiwan Jinjiya',
		title_zh: '嘉義縣日本時代博物館學會',
		match: 'taiwan-jinjya.com',
	},
	{
		title: 'Writing Taichung',
		title_zh: '寫作中區',
		match: 'writingtaichung.blogspot.', // Both .com and .tw in use
	},
	{
		title: 'Fake Literary Youth',
		title_zh: '假文青的廢墟散步',
		match: 'fakeliteraryyouth.blogspot.',
	},
	{
		title: 'Tomboy Urbex',
		match: 'tomboy-urbex.com',
	},
	{
		title: 'Tainan City Guide',
		match: 'tainancity.wordpress.com',
	},
	{
		title: 'Scholastica',
		title_zh: '隱身巷弄的天堂',
		match: 'scholastica.org', // Previously on Xuite
	},
	{
		title: 'Greenset',
		title_zh: '廢墟 -魂-',
		match: 'greenset.wordpress.com',
	},
	{
		title: 'Lost Elementary Schools',
		title_zh: '失去的小學',
		match: 'angelabeetle16.blogspot.com',
	},
	{
		title: 'High YoYo by Erwin Deng',
		match: 'erwin-deng.blogspot.',
	},
	{
		title: 'Teatro Della Evance',
		title_zh: '銀河新夢',
		match: 'evanceair.pixnet.net',
	},
	{
		title: 'Crying Black Bear',
		title_zh: '愛哭の黑熊',
		match: 'icry.tw',
	},
	{
		title: 'Hualien A-rong',
		title_zh: '花蓮ㄚ榮',
		match: '520mizuho.blogspot.',
	},
	{
		title: "Rhino King's Railway House",
		title_zh: '犀牛王的教育與鐵道小窩',
		match: 'rhinohcp.blogspot.',
	},
	{
		title: "Leon's Way",
		match: 'leonsway.blogspot.',
	},
	{
		title: 'Time Field',
		title_zh: '時光土場',
		match: 'milkyrailway.blogspot.',
	},
	{
		title: "Egghead's Fantasy World",
		title_zh: '蛋頭的奇想世界',
		match: 'egghead0522.blogspot.',
	},
	{
		title: 'Beitoupu Lin Bingyan',
		title_zh: '北投埔林炳炎',
		match: 'pylin.kaishao.idv.',
	},
	{
		title: 'Explore The Uncharted',
		match: 'rdwrertaiwan.blogspot.',
	},
	{
		title: 'WorldSCREEW',
		title_zh: '世界雷影',
		match: 'worldscreewinc.wordpress.com',
	},
	{
		title: 'Cultural Assets Bureau',
		title_zh: '文化部文化資產局',
		match: 'nchdb.boch.gov.tw',
	},
	{
		title: 'Taiwan Cultural Memory Bank',
		title_zh: '文化部國家文化記憶庫',
		match: 'memory.culture.tw', // This project uses two URLs
	},
	{
		title: 'Taiwan Cultural Memory Bank',
		title_zh: '文化部國家文化記憶庫',
		match: 'tcmb.culture.tw',
	},
	{
		title: 'Cultural Heritage Map of Old Theaters in Taiwan',
		title_zh: '臺灣老戲院文史地圖',
		match: 'map.net.tw/theater',
	},
	{
		title: 'Taiwan Film & Audiovisual Institute (TFAI)',
		match: 'tfai.openmuseum.tw',
	},
	{
		title: 'Academia Sinica Digital Culture Center',
		title_zh: '中央研究院數位文化中心',
		match: 'openmuseum.tw',
	},
	{
		title: 'National Museum of Taiwan History',
		title_zh: '國立臺灣歷史博物館',
		match: 'nmth.gov.tw',
	},
	{
		title: 'Digital Taiwan',
		title_zh: '典藏台灣',
		match: 'catalog.digitalarchives.tw',
	},
	{
		title: 'National Taiwan Library',
		title_zh: '國家圖書館',
		match: 'tm.ncl.edu.tw',
	},
	{
		title: 'Culture Resources Geographic Information System',
		title_zh: '文化資源地理資訊系統',
		match: 'crgis.rchss.sinica.edu.tw',
	},
	{
		title: 'Taiwan Cultural Memory Bank Curation Platform',
		title_zh: '國家文化記憶庫2.0線上策展平臺',
		match: 'curation.culture.tw',
	},
	{
		title: 'Cultural Heritage Map of Taiwan Sugar Factories',
		title_zh: '台灣製糖工場百年文史地圖',
		match: 'map.net.tw/taisugar',
	},
	{
		title: 'Cultural Heritage Map of Taiwan Power Plants',
		title_zh: '臺灣電廠百年文史地圖',
		match: 'map.net.tw/taipower',
	},
	{
		title: 'Cultural Heritage Map of Taiwan POW Camps',
		title_zh: '第二次世界大戰臺灣戰俘營地圖',
		match: 'map.net.tw/pow/',
	},
	{
		title: 'Hakka Cloud',
		title_zh: '客家雲',
		match: 'cloud.hakka.gov.tw',
	},
	{
		title: 'Taipei Municipal Archives Xinyi District Cultural and Historical Map',
		title_zh: '臺北市立文獻館信義區文史地圖',
		match: 'chr-xytour.utaipei.edu.tw',
	},
	{
		title: 'Taiwan Religious Cultural Map',
		title_zh: '臺灣宗教文化地圖',
		match: 'taiwangods.moi.gov.tw',
	},
	{
		title: 'Historical Sites of Injustice Archive',
		title_zh: '國家人權博物館',
		match: 'hsi.nhrm.gov.tw',
	},
	{
		title: 'Taipei Times',
		match: 'taipeitimes.com',
	},
	{
		title: 'Liberty Times',
		title_zh: '自由時報',
		match: 'ltn.com.tw',
	},
	{
		title: 'The Reporter',
		title_zh: '報導者',
		match: 'twreporter.org',
	},
	{
		title: 'United Daily News',
		match: 'udn.com',
	},
	{
		title: 'Central News Agency',
		title_zh: '中央通訊社',
		match: 'cna.com.tw',
	},
	{
		title: 'Focus Taiwan',
		match: 'focustaiwan.tw',
	},
	{
		title: 'Storm Media',
		title_zh: '風傳媒',
		match: 'storm.mg',
	},
	{
		title: 'TVBS',
		match: 'tvbs.com.tw',
	},
	{
		title: 'Mirror Media',
		match: 'mirrormedia.mg',
	},
	{
		title: 'The News Lens',
		title_zh: '關鍵評論',
		match: 'thenewslens.com/',
	},
	{
		title: 'China Times',
		title_zh: '中時新聞網',
		match: 'chinatimes.com',
	},
	{
		title: 'ETtoday',
		match: 'ettoday.net',
	},
	{
		title: 'Smile Taiwan',
		title_zh: '微笑台灣',
		match: 'smiletaiwan.cw.com.tw',
	},
	{
		title: 'Commonwealth Magazine',
		title_zh: '天下雜誌',
		match: 'cw.com.tw',
	},
	{
		title: 'Wilhelm Chang',
		title_zh: '張威廉',
		match: 'wilhelmchang.com',
	},
	{
		title: 'XinMedia',
		title_zh: '欣傳媒',
		match: 'xinmedia.com',
	},
	{
		title: 'Vocus',
		match: 'vocus.cc',
	},
	{
		title: 'Keelung HiHi',
		title_zh: '基隆嗨嗨',
		match: 'keelunghihi.com.tw',
	},
	{
		title: 'Our Island',
		title_zh: '我們的島',
		match: 'ourisland.pts.org.tw',
	},
	{
		title: 'Initium Media',
		title_zh: '端傳媒',
		match: 'theinitium.com',
	},
	{
		title: 'PTS News',
		title_zh: '公視新聞網',
		match: 'pts.org.tw',
	},
	{
		title: 'PeoPo',
		title_zh: '公民新聞',
		match: 'peopo.org',
	},
	{
		title: 'Yahoo News Taiwan',
		match: 'tw.news.yahoo.com',
	},
	{
		title: 'Wikipedia',
		match: 'en.wikipedia.org',
	},
	{
		title: 'Wikipedia in Chinese',
		title_zh: '中文維基百科',
		match: 'zh.wikipedia.org',
	},
	{
		title: 'Wikipedia in Japanese',
		title_ja: 'ウィキペディア日本語版',
		match: 'ja.wikipedia.org',
	},
	{
		title: 'Wikipedia in Thai',
		title_th: 'วิกิพีเดียภาษาไทย',
		match: 'th.wikipedia.org',
	},
	{
		title: 'Wikipedia in Vietnamese',
		title_th: 'Wikipedia tiếng Việt',
		match: 'vi.wikipedia.org',
	},
	{
		title: 'Wikimedia Commons',
		match: 'commons.wikimedia.org',
	},
	{
		title: 'Google Maps', // Note: this is used when generating map data for locations
		match: 'maps.app.goo.gl',
	},
	{
		title: 'DataGov Business Record',
		match: 'datagovtw.com',
	},
	{
		title: 'OpenGov Business Record',
		match: 'opengovtw.com',
	},
	{
		title: 'Lanyang Museum',
		title_zh: '宜蘭縣立蘭陽博物館',
		match: 'lym.gov.tw',
	},
	{
		title: 'POW Taiwan',
		match: 'powtaiwan.org',
	},
	{
		title: 'Greenset on Flickr',
		match: 'flickr.com/photos/greenset',
	},
	{
		title: 'csdido on Flickr',
		match: 'flickr.com/photos/csdido',
	},
	{
		title: 'Bahamut',
		title_zh: '巴哈姆特',
		match: 'gamer.com.tw/',
	},
	{
		title: 'Keepon',
		title_zh: '登山補給站',
		match: 'keepon.com.tw',
	},
	{
		title: 'Hiking Note',
		title_zh: '健康筆記',
		match: 'hiking.biji.co',
	},
	{
		title: 'I Love Hsichou',
		title_zh: '我愛溪州',
		match: 'love-hsichou.blogspot.',
	},
	{
		title: 'Taitung Echo Art',
		title_zh: '臺東聚落回聲',
		match: 'echotaitung.tw',
	},
	{
		title: 'See You Again',
		title_zh: '再見到你',
		match: 'seeyouagaintw.wordpress.',
	},
	{
		title: 'Lingyaliao',
		title_zh: '苓雅寮',
		match: 'lingyaliao.blogspot.',
	},
	{
		title: 'Nostalgic Zhushan',
		title_zh: '繁花盡落林圮埔',
		match: 'bachbeethoven.blogspot.',
	},
	{
		title: 'NOWnews',
		title_zh: '今日時間',
		match: 'nownews.com',
	},
	{
		title: 'Earth Photo Gallery Team',
		title_zh: 'DQ地球圖輯隊',
		match: 'dq.yam.com',
	},
	{
		title: 'Penghu Info',
		title_zh: '澎湖知識服務平台',
		match: 'penghu.info',
	},
	{
		title: 'Iron Cat',
		title_zh: '鐵錨',
		match: 'jp-shitman.blogspot.',
	},
	{
		title: 'Yilan Notes',
		title_zh: '宜蘭‧天晴‧風雨香',
		match: 'g337918.com.tw',
	},
	{
		title: 'HopOut',
		match: 'hopout.com.tw',
	},
	{
		title: 'Taiwan Trails and Tales',
		match: 'taiwantrailsandtales.com',
	},
	{
		title: 'News&Market',
		title_zh: '上下游',
		match: 'newsmarket.com.tw',
	},
	{
		title: 'Chiayi Travel',
		title_zh: '慢遊嘉義',
		match: 'chiayicamera.tw',
	},
	{
		title: 'Vivid Memory',
		title_zh: '記憶鮮明',
		match: 'kudos12.wordpress.',
	},
	{
		title: "Blair and Kate's Tourism and Food",
		title_zh: "Blair and Kate's 旅遊與美食",
		match: 'blair-kate.blogspot.',
	},
	{
		title: "Blair's Railway Photography",
		title_zh: "Blair's 鐵道攝影",
		match: 'blair-train.blogspot.',
	},
	{
		title: 'Micromosa',
		match: 'micromosa.com',
	},
	{
		title: 'Kinmen Daily News',
		title_zh: '金門日報',
		match: 'kmdn.gov.tw',
	},
	{
		title: 'Dax Ward',
		match: 'daxward.com',
	},
	{
		title: 'Tom Higgs',
		match: 'https://www.flickr.com/photos/truebritishmetal/',
	},
	{
		title: 'Reading Military Villages',
		title_zh: '閱讀眷村',
		match: 'lov.vac.gov.tw',
	},
	{
		title: 'Lin Chun-sheng',
		title_zh: '林小昇之米克斯拼盤',
		match: 'linchunsheng.blogspot.',
	},
	{
		title: '228 Memorial Foundation',
		title_zh: '二二八事件紀念基金會',
		match: '228.org.tw',
	},
] as const satisfies Array<LinksMapItem>;
