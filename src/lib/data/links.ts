// Commonly linked domains
// Note: we're using an array of tuples since sources may repeat with different URL fragments
// cSpell:disable -- Too many proper names in this file
interface LinksMapItem {
	title: string;
	titleAlt?: string;
	match: string;
}

export const linksMap = [
	{
		title: 'Just A Balcony',
		match: 'justabalcony.blogspot.', // Both .com and .tw in use
	},
	{
		title: 'Wild Land Travel',
		titleAlt: '-地球上的火星人-下巴 (野地旅)',
		match: 'theericel.blogspot.',
	},
	{
		title: `Shepherd's Wolf`,
		titleAlt: '放羊的狼',
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
		titleAlt: '飛行場の測候所',
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
		titleAlt: '台湾に渡った日本の神々',
		match: 'blog.goo.ne.jp/jinjya_taiwan',
	},
	{
		title: 'Taiwan Jinjiya',
		titleAlt: '嘉義縣日本時代博物館學會',
		match: 'taiwan-jinjya.com',
	},
	{
		title: 'Writing Taichung',
		titleAlt: '寫作中區',
		match: 'writingtaichung.blogspot.', // Both .com and .tw in use
	},
	{
		title: 'Fake Literary Youth',
		titleAlt: '假文青的廢墟散步',
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
		titleAlt: '隱身巷弄的天堂',
		match: 'scholastica.org', // Previously on Xuite
	},
	{
		title: 'Greenset',
		titleAlt: '廢墟 -魂-',
		match: 'greenset.wordpress.com',
	},
	{
		title: 'Lost Elementary Schools',
		titleAlt: '失去的小學',
		match: 'angelabeetle16.blogspot.com',
	},
	{
		title: 'High YoYo by Erwin Deng',
		match: 'erwin-deng.blogspot.',
	},
	{
		title: 'Teatro Della Evance',
		titleAlt: '銀河新夢',
		match: 'evanceair.pixnet.net',
	},
	{
		title: 'Crying Black Bear',
		titleAlt: '愛哭の黑熊',
		match: 'icry.tw',
	},
	{
		title: 'Hualien A-rong',
		titleAlt: '花蓮ㄚ榮',
		match: '520mizuho.blogspot.',
	},
	{
		title: "Rhino King's Railway House",
		titleAlt: '犀牛王的教育與鐵道小窩',
		match: 'rhinohcp.blogspot.',
	},
	{
		title: 'Time Field',
		titleAlt: '時光土場',
		match: 'milkyrailway.blogspot.',
	},
	{
		title: "Egghead's Fantasy World",
		titleAlt: '蛋頭的奇想世界',
		match: 'egghead0522.blogspot.',
	},
	{
		title: 'Beitoupu Lin Bingyan',
		titleAlt: '北投埔林炳炎',
		match: 'pylin.kaishao.idv.',
	},
	{
		title: 'Explore The Uncharted',
		match: 'rdwrertaiwan.blogspot.',
	},
	{
		title: 'WorldSCREEW',
		titleAlt: '世界雷影',
		match: 'worldscreewinc.wordpress.com',
	},
	{
		title: 'Cultural Assets Bureau',
		titleAlt: '文化部文化資產局',
		match: 'nchdb.boch.gov.tw',
	},
	{
		title: 'Taiwan Cultural Memory Bank',
		titleAlt: '文化部國家文化記憶庫',
		match: 'memory.culture.tw', // This project uses two URLs
	},
	{
		title: 'Taiwan Cultural Memory Bank',
		titleAlt: '文化部國家文化記憶庫',
		match: 'tcmb.culture.tw',
	},
	{
		title: 'Cultural Heritage Map of Old Theaters in Taiwan',
		titleAlt: '臺灣老戲院文史地圖',
		match: 'map.net.tw/theater',
	},
	{
		title: 'Taiwan Film & Audiovisual Institute (TFAI)',
		match: 'tfai.openmuseum.tw',
	},
	{
		title: 'Academia Sinica Digital Culture Center',
		titleAlt: '中央研究院數位文化中心',
		match: 'openmuseum.tw',
	},
	{
		title: 'National Museum of Taiwan History',
		titleAlt: '國立臺灣歷史博物館',
		match: 'nmth.gov.tw',
	},
	{
		title: 'Digital Taiwan',
		titleAlt: '典藏台灣',
		match: 'catalog.digitalarchives.tw',
	},
	{
		title: 'National Taiwan Library',
		titleAlt: '國家圖書館',
		match: 'tm.ncl.edu.tw',
	},
	{
		title: 'Culture Resources Geographic Information System',
		titleAlt: '文化資源地理資訊系統',
		match: 'crgis.rchss.sinica.edu.tw',
	},
	{
		title: 'Taiwan Cultural Memory Bank Curation Platform',
		titleAlt: '國家文化記憶庫2.0線上策展平臺',
		match: 'curation.culture.tw',
	},
	{
		title: 'Cultural Heritage Map of Taiwan Sugar Factories',
		titleAlt: '台灣製糖工場百年文史地圖',
		match: 'map.net.tw/taisugar',
	},
	{
		title: 'Cultural Heritage Map of Taiwan Power Plants',
		titleAlt: '臺灣電廠百年文史地圖',
		match: 'map.net.tw/taipower',
	},
	{
		title: 'Cultural Heritage Map of Taiwan POW Camps',
		titleAlt: '第二次世界大戰臺灣戰俘營地圖',
		match: 'map.net.tw/pow/',
	},
	{
		title: 'Hakka Cloud',
		titleAlt: '客家雲',
		match: 'cloud.hakka.gov.tw',
	},
	{
		title: 'Taipei Municipal Archives Xinyi District Cultural and Historical Map',
		titleAlt: '臺北市立文獻館信義區文史地圖',
		match: 'chr-xytour.utaipei.edu.tw',
	},
	{
		title: 'Taiwan Religious Cultural Map',
		titleAlt: '臺灣宗教文化地圖',
		match: 'taiwangods.moi.gov.tw',
	},
	{
		title: 'Historical Sites of Injustice Archive',
		titleAlt: '國家人權博物館',
		match: 'hsi.nhrm.gov.tw',
	},
	{
		title: 'Taipei Times',
		match: 'taipeitimes.com',
	},
	{
		title: 'Liberty Times',
		titleAlt: '自由時報',
		match: 'ltn.com.tw',
	},
	{
		title: 'The Reporter',
		titleAlt: '報導者',
		match: 'twreporter.org',
	},
	{
		title: 'United Daily News',
		match: 'udn.com',
	},
	{
		title: 'Central News Agency',
		titleAlt: '中央通訊社',
		match: 'cna.com.tw',
	},
	{
		title: 'Focus Taiwan',
		match: 'focustaiwan.tw',
	},
	{
		title: 'Storm Media',
		titleAlt: '風傳媒',
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
		titleAlt: '關鍵評論',
		match: 'thenewslens.com/',
	},
	{
		title: 'China Times',
		titleAlt: '中時新聞網',
		match: 'chinatimes.com',
	},
	{
		title: 'ETtoday',
		match: 'ettoday.net',
	},
	{
		title: 'Smile Taiwan',
		titleAlt: '微笑台灣',
		match: 'smiletaiwan.cw.com.tw',
	},
	{
		title: 'Wilhelm Chang',
		titleAlt: '張威廉',
		match: 'wilhelmchang.com',
	},
	{
		title: 'Commonwealth Magazine',
		titleAlt: '天下雜誌',
		match: 'www.cw.com.tw',
	},
	{
		title: 'XinMedia',
		titleAlt: '欣傳媒',
		match: 'xinmedia.com',
	},
	{
		title: 'Vocus',
		match: 'vocus.cc',
	},
	{
		title: 'Keelung HiHi',
		titleAlt: '基隆嗨嗨',
		match: 'keelunghihi.com.tw',
	},
	{
		title: 'Our Island',
		titleAlt: '我們的島',
		match: 'ourisland.pts.org.tw',
	},
	{
		title: 'PTS News',
		titleAlt: '公視新聞網',
		match: 'pts.org.tw',
	},
	{
		title: 'PeoPo',
		titleAlt: '公民新聞',
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
		titleAlt: '維基百科',
		match: 'zh.wikipedia.org',
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
		titleAlt: '宜蘭縣立蘭陽博物館',
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
		titleAlt: '巴哈姆特',
		match: 'gamer.com.tw/',
	},
	{
		title: 'Keepon',
		titleAlt: '登山補給站',
		match: 'keepon.com.tw',
	},
	{
		title: 'Hiking Note',
		titleAlt: '健康筆記',
		match: 'hiking.biji.co',
	},
	{
		title: 'I Love Hsichou',
		titleAlt: '我愛溪州',
		match: 'love-hsichou.blogspot.',
	},
	{
		title: 'Taitung Echo Art',
		titleAlt: '臺東聚落回聲',
		match: 'echotaitung.tw',
	},
	{
		title: 'See You Again',
		titleAlt: '再見到你',
		match: 'seeyouagaintw.wordpress.',
	},
	{
		title: 'Lingyaliao',
		titleAlt: '苓雅寮',
		match: 'lingyaliao.blogspot.',
	},
	{
		title: 'Nostalgic Zhushan',
		titleAlt: '繁花盡落林圮埔',
		match: 'bachbeethoven.blogspot.',
	},
	{
		title: 'NOWnews',
		titleAlt: '今日時間',
		match: 'nownews.com',
	},
	{
		title: 'Earth Photo Gallery Team',
		titleAlt: 'DQ地球圖輯隊',
		match: 'dq.yam.com',
	},
	{
		title: 'Penghu Info',
		titleAlt: '澎湖知識服務平台',
		match: 'penghu.info',
	},
	{
		title: 'Iron Cat',
		titleAlt: '鐵錨',
		match: 'jp-shitman.blogspot.',
	},
	{
		title: 'Yilan Notes',
		titleAlt: '宜蘭‧天晴‧風雨香',
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
		titleAlt: '上下游',
		match: 'newsmarket.com.tw',
	},
	{
		title: 'Chiayi Travel',
		titleAlt: '慢遊嘉義',
		match: 'chiayicamera.tw',
	},
	{
		title: 'Vivid Memory',
		titleAlt: '記憶鮮明',
		match: 'kudos12.wordpress.',
	},
	{
		title: "Blair and Kate's Tourism and Food",
		titleAlt: "Blair and Kate's 旅遊與美食",
		match: 'blair-kate.blogspot.',
	},
	{
		title: "Blair's Railway Photography",
		titleAlt: "Blair's 鐵道攝影",
		match: 'blair-train.blogspot.',
	},
	{
		title: 'Micromosa',
		match: 'micromosa.com',
	},
	{
		title: 'Kinmen Daily News',
		titleAlt: '金門日報',
		match: 'kmdn.gov.tw',
	},
] as const satisfies Array<LinksMapItem>;
