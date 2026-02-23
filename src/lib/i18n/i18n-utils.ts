import type { LanguageCode, MultilingualContent } from '#lib/i18n/i18n-types.ts';

import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';

interface MultilingualContentOptions {
	data: Record<string, unknown> | undefined;
	prop: string;
	langCode?: LanguageCode;
}

function getAllMultilingualContent({
	data,
	prop,
	langCode,
}: MultilingualContentOptions): Array<MultilingualContent> | undefined {
	if (!data) return;

	const allCodes = Object.values(LanguageCodeEnum) as Array<LanguageCode>;
	const languages = langCode
		? [langCode, ...allCodes.filter((code) => code !== langCode)]
		: allCodes;

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

export function getMultilingualContent({
	langCodeAdditional,
	...options
}: MultilingualContentOptions & { langCodeAdditional?: LanguageCode }):
	| {
			primary: MultilingualContent;
			additional?: MultilingualContent;
	  }
	| undefined {
	const multilingualContent = getAllMultilingualContent(options);

	if (!multilingualContent) return;

	const primary = multilingualContent[0];

	if (!primary) return;

	const additional = langCodeAdditional
		? multilingualContent.find(
				(item) => item.lang === langCodeAdditional && item.lang !== primary.lang,
			)
		: undefined;

	return additional ? { primary, additional } : { primary };
}
