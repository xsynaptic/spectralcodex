export const LanguageCodeEnum = {
	English: 'en',
	ChineseTraditional: 'zh',
	ChineseSimplified: 'zh-Hans',
	Japanese: 'ja',
	Thai: 'th',
	Korean: 'ko',
	Vietnamese: 'vi',
} as const;

export type LanguageCode = (typeof LanguageCodeEnum)[keyof typeof LanguageCodeEnum];

export interface MultilingualContent {
	lang: LanguageCode;
	value: string;
}
