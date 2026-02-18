import type { LanguageCode, MultilingualContent } from '#lib/i18n/i18n-types.ts';

import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';

function getMultilingualContent(
	data: Record<string, unknown> | undefined,
	id: string,
	priority?: Array<LanguageCode>,
): Array<MultilingualContent> | undefined {
	if (!data) return;

	const languages = priority ?? Object.values(LanguageCodeEnum);

	const multilingualContent: Array<MultilingualContent> = [];

	for (const languageCode of languages) {
		const key = `${id}_${languageCode}`;
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

export function getPrimaryMultilingualContent(
	data: Record<string, unknown> | undefined,
	id: string,
	priority?: Array<LanguageCode>,
): MultilingualContent | undefined {
	const multilingualContent = getMultilingualContent(data, id, priority);

	return multilingualContent ? multilingualContent[0] : undefined;
}
