import type { LanguageCode, MultilingualContent } from '#lib/i18n/i18n-types.ts';

import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';

export function getMultilingualContent(
	data: Record<string, unknown> | undefined,
	id: string,
	priority?: Array<LanguageCode>,
): MultilingualContent | undefined {
	if (!data) return;

	const languages = priority ?? Object.values(LanguageCodeEnum);

	for (const languageCode of languages) {
		const key = `${id}_${languageCode}`;
		const value = data[key];

		if (typeof value === 'string') {
			return {
				lang: languageCode,
				value,
			};
		}
	}
	return;
}
