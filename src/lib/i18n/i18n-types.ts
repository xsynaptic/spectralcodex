export const LanguageCodeEnum = {
	English: 'en',
	ChineseMandarin: 'zh',
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
