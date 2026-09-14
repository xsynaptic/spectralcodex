export const LanguageCodeEnum = {
	ChineseSimplified: 'zh-Hans',
	ChineseTraditional: 'zh',
	English: 'en',
	Japanese: 'ja',
	Korean: 'ko',
	Thai: 'th',
	Vietnamese: 'vi',
} as const;

export type LanguageCode = (typeof LanguageCodeEnum)[keyof typeof LanguageCodeEnum];

// Render order for multilingual content; the enum above is lookup only
export const languageCodeOrder: ReadonlyArray<LanguageCode> = [
	LanguageCodeEnum.English,
	LanguageCodeEnum.ChineseTraditional,
	LanguageCodeEnum.ChineseSimplified,
	LanguageCodeEnum.Japanese,
	LanguageCodeEnum.Thai,
	LanguageCodeEnum.Korean,
	LanguageCodeEnum.Vietnamese,
];

export interface MultilingualContent {
	lang: LanguageCode;
	value: string;
}
