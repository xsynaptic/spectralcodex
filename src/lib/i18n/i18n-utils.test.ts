import { describe, expect, test } from 'vitest';

import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';

describe('getMultilingualContent', () => {
	test.each([
		{
			expected: 'en',
			label: 'English when no language is requested',
			options: { data: { title_en: 'en', title_ja: 'ja', title_zh: 'zh' } },
		},
		{
			expected: 'zh',
			label: 'Traditional Chinese over Japanese when English is absent',
			options: { data: { title_ja: 'ja', title_zh: 'zh' } },
		},
		{
			expected: 'zh',
			label: 'the requested language',
			options: { data: { title_en: 'en', title_zh: 'zh' }, langCode: 'zh' },
		},
	] as const)('leads with $label', ({ expected, options }) => {
		expect(getMultilingualContent({ ...options, prop: 'title' })?.primary.lang).toBe(expected);
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
