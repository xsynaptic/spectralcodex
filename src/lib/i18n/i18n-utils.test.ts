import { describe, expect, test } from 'vitest';

import { LanguageCodeEnum, languageCodeOrder } from '#lib/i18n/i18n-types.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';

describe('getMultilingualContent', () => {
	test('leads with English when no language is requested', () => {
		const data = { title_en: 'en', title_ja: 'ja', title_zh: 'zh' };

		expect(getMultilingualContent({ data, prop: 'title' })?.primary.lang).toBe('en');
	});

	test('leads with Traditional Chinese over Japanese when English is absent', () => {
		const data = { title_ja: 'ja', title_zh: 'zh' };

		expect(getMultilingualContent({ data, prop: 'title' })?.primary.lang).toBe('zh');
	});

	test('leads with the requested language', () => {
		const data = { title_en: 'en', title_zh: 'zh' };

		expect(getMultilingualContent({ data, langCode: 'zh', prop: 'title' })?.primary.lang).toBe(
			'zh',
		);
	});
});

describe('languageCodeOrder', () => {
	test('lists every language code exactly once', () => {
		const languageCodes = Object.values(LanguageCodeEnum);

		expect(languageCodeOrder).toHaveLength(languageCodes.length);
		expect(new Set(languageCodeOrder)).toEqual(new Set(languageCodes));
	});
});
