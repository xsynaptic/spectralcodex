import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';

/**
 * Regions
 */
export const RegionLanguageMap = {
	china: LanguageCodeEnum.ChineseTraditional,
	japan: LanguageCodeEnum.Japanese,
	'south-korea': LanguageCodeEnum.Korean,
	taiwan: LanguageCodeEnum.ChineseTraditional,
	// When we include other scripts in Vietnam posts its usually Chinese
	vietnam: LanguageCodeEnum.ChineseTraditional,
} as const;

export type RegionLanguage = (typeof RegionLanguageMap)[keyof typeof RegionLanguageMap];
