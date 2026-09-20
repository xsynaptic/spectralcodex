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

	test('the rest of the languages stay available behind the requested one', () => {
		const data = { title_en: 'en', title_ja: 'ja', title_zh: 'zh' };

		expect(
			getMultilingualContent({ data, langCode: 'zh', langCodeAdditional: 'ja', prop: 'title' }),
		).toStrictEqual({
			additional: { lang: 'ja', value: 'ja' },
			primary: { lang: 'zh', value: 'zh' },
		});
	});

	test('an additional language that is already primary is not repeated', () => {
		const data = { title_en: 'en', title_zh: 'zh' };

		expect(
			getMultilingualContent({ data, langCode: 'zh', langCodeAdditional: 'zh', prop: 'title' }),
		).toStrictEqual({ primary: { lang: 'zh', value: 'zh' } });
	});

	test('no data and no matching property both answer undefined', () => {
		expect(getMultilingualContent({ data: undefined, prop: 'title' })).toBeUndefined();
		expect(getMultilingualContent({ data: { title: 'plain' }, prop: 'title' })).toBeUndefined();
	});
});

describe('languageCodeOrder', () => {
	test('lists every language code exactly once', () => {
		const languageCodes = Object.values(LanguageCodeEnum);

		expect(languageCodeOrder).toHaveLength(languageCodes.length);
		expect(new Set(languageCodeOrder)).toEqual(new Set(languageCodes));
	});
});
