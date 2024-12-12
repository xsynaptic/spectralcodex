import defaultTheme from 'tailwindcss/defaultTheme';

import type { CustomThemeConfig } from 'tailwindcss/types/config';

// Apple Color Emoji is responsible for rendering back links in footnotes as emoji
const filterEmojiFont = (font: string) =>
	!['"Apple Color Emoji"', 'sans-serif', 'sans'].includes(font);

// Several traditional Chinese font stacks collected over the years
const systemFontStacksChinese = {
	// Songti: similar to serif; think Times New Roman
	zhSongtiSc: [
		'Songti SC',
		'STSong',
		'华文宋体',
		'宋体',
		'SimSun',
		'新宋体',
		'NSimSun',
		'AR PL New Sung',
		'AR PL SungtiL GB',
	],
	zhSongtiTc: [
		'Songti TC',
		'LiSong Pro',
		'Apple LiSung',
		'新細明體',
		'PMingLiU',
		'MingLiU',
		'AR PL Mingti2L',
		'TW-Sung',
	],
	// Heiti: similar to sans-serif; think Helvetica/Arial
	zhHeitiSc: [
		'Heiti SC',
		'Microsoft YaHei New',
		'Microsoft Yahei',
		'微软雅黑',
		'SimHei',
		'黑体',
		'STHeiti Light',
		'STXihei',
		'华文细黑',
		'STHeiti',
		'华文黑体',
		'WenQuanYi Zen Hei',
	],
	zhHeitiTc: ['Noto Sans TC', 'Heiti TC', 'Microsoft JhengHei', 'PingFang TC', '微軟正黑體'],
	// Kaiti: a regular brush script
	zhKaitiSc: ['Kaiti SC', 'KaiTi', '楷体', 'STKaiti', '华文楷体', 'Kai', 'AR PL UKai CN'],
	zhKaitiTc: [
		'BiauKai',
		'DFKai-SB',
		'AR PL KaitiM',
		'AR PL KaitiM GB',
		'AR PL UKai HK',
		'AR PL UKai TW',
		'TW-Kai',
	],
	// Fangsongti: stylized brush script; a fusion of kaiti and songti styles; only available for simplified Chinese insofar as I can tell
	zhFangsongSc: ['FangSong', 'Fang Song', '仿宋', 'STFangSong', '华文仿宋'],
};

// Note: not all of these are currently used in this project
export const fontFamily = {
	display: [
		'Geologica Variable',
		...defaultTheme.fontFamily.sans.filter(filterEmojiFont),
		...systemFontStacksChinese.zhHeitiTc,
		'sans-serif',
	],
	serif: [
		'Lora Variable',
		...defaultTheme.fontFamily.serif.filter(filterEmojiFont),
		...systemFontStacksChinese.zhSongtiTc,
		'serif',
	],
	sans: [
		'Commissioner Variable',
		...defaultTheme.fontFamily.sans.filter(filterEmojiFont),
		...systemFontStacksChinese.zhHeitiTc,
		'sans-serif',
	],
	heiti: [...systemFontStacksChinese.zhHeitiTc, 'sans-serif'],
	songti: [...systemFontStacksChinese.zhSongtiTc, 'serif'],
	kaiti: [...systemFontStacksChinese.zhKaitiTc, 'cursive'],
} satisfies Partial<CustomThemeConfig>;
