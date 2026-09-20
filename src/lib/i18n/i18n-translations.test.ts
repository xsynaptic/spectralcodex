import { describe, expect, test } from 'vitest';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';

describe('getTranslations', () => {
	test('a language with its own string gets that string, not the English one', () => {
		const t = getTranslations();

		expect(t('notice.danger', 'zh')).not.toBe(t('notice.danger', 'en'));
	});

	test('a key missing from a language falls back to English', () => {
		const t = getTranslations();

		expect(t('notFound.title', 'zh')).toBe(t('notFound.title', 'en'));
		expect(t('notFound.title', 'ja')).toBe(t('notFound.title', 'en'));
	});

	test('English is the default when no language is named', () => {
		const t = getTranslations();

		expect(t('notice.danger')).toBe(t('notice.danger', 'en'));
	});
});

describe('getTranslations plural', () => {
	test('picks the singular or plural form by count, interpolating it', () => {
		const t = getTranslations();

		expect(t.plural('content.meta.backlinks.label', 1)).toBe('1 Backlink');
		expect(t.plural('content.meta.backlinks.label', 2)).toBe('2 Backlinks');
	});

	test('a language with no singular category takes the other form', () => {
		const t = getTranslations();

		expect(t.plural('content.meta.backlinks.label', 1, { langCode: 'zh' })).toBe('1 Backlinks');
	});

	test('carries the remaining placeholders alongside the count', () => {
		const t = getTranslations();

		expect(t.plural('activityGraph.tooltip', 3, { date: 'May 13th' })).toBe('3 events: May 13th');
	});
});
