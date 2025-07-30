import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';

/**
 * Regions
 */
export const RegionLanguageMap = {
	china: LanguageCodeEnum.ChineseMandarin,
	japan: LanguageCodeEnum.Japanese,
	'south-korea': LanguageCodeEnum.Korean,
	taiwan: LanguageCodeEnum.ChineseMandarin,
	// When we include other scripts in Vietnam posts its usually Chinese
	vietnam: LanguageCodeEnum.ChineseMandarin,
} as const;

export type RegionLanguage = (typeof RegionLanguageMap)[keyof typeof RegionLanguageMap];
