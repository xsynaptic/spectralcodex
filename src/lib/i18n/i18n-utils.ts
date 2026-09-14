import type { LanguageCode, MultilingualContent } from '#lib/i18n/i18n-types.ts';

import { LanguageCodeEnum, languageCodeOrder } from '#lib/i18n/i18n-types.ts';

const cjkLanguages: ReadonlySet<LanguageCode> = new Set([
	LanguageCodeEnum.ChineseSimplified,
	LanguageCodeEnum.ChineseTraditional,
	LanguageCodeEnum.Japanese,
	LanguageCodeEnum.Korean,
]);

interface MultilingualContentOptions {
	data: Record<string, unknown> | undefined;
	langCode?: LanguageCode;
	prop: string;
}

export function formatTitleMultilingual(
	title: string,
	titleMultilingual: MultilingualContent | undefined,
) {
	return titleMultilingual ? `${title} (${titleMultilingual.value})` : title;
}

// Map data shows English + Traditional Chinese for zh-language regions
export function getMapLanguages(langCode: string | undefined) {
	return langCode?.startsWith('zh')
		? { languages: [LanguageCodeEnum.English, LanguageCodeEnum.ChineseTraditional] }
		: {};
}

export function getMultilingualContent({
	langCodeAdditional,
	...options
}: MultilingualContentOptions & { langCodeAdditional?: LanguageCode }):
	| undefined
	| {
			additional?: MultilingualContent;
			primary: MultilingualContent;
	  } {
	const multilingualContent = getAllMultilingualContent(options);

	if (!multilingualContent) return;

	const primary = multilingualContent[0];

	if (!primary) return;

	const additional = langCodeAdditional
		? multilingualContent.find(
				(item) => item.lang === langCodeAdditional && item.lang !== primary.lang,
			)
		: undefined;

	return additional ? { additional, primary } : { primary };
}

export function isCjkLanguage(lang: LanguageCode): boolean {
	return cjkLanguages.has(lang);
}

function getAllMultilingualContent({
	data,
	langCode,
	prop,
}: MultilingualContentOptions): Array<MultilingualContent> | undefined {
	if (!data) return;

	const languages = langCode
		? [langCode, ...languageCodeOrder.filter((code) => code !== langCode)]
		: languageCodeOrder;

	const multilingualContent: Array<MultilingualContent> = [];

	for (const languageCode of languages) {
		const key = `${prop}_${languageCode}`;
		const value = data[key];

		if (typeof value === 'string') {
			multilingualContent.push({
				lang: languageCode,
				value,
			});
		}
	}

	return multilingualContent.length > 0 ? multilingualContent : undefined;
}
