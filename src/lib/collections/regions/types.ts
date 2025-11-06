import { LanguageCodeEnum } from '#lib/types/index.ts';

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
