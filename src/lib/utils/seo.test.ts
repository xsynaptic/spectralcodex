import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getSeoArticleProps, getSeoHideSearch, getSeoImageProps } from '#lib/utils/seo.ts';

const site = 'https://spectralcodex.com';

beforeEach(() => {
	vi.stubEnv('SITE', site);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('getSeoArticleProps', () => {
	test('omits the modified time entirely when the entry was never updated', () => {
		const { article } = getSeoArticleProps({
			dateCreated: new Date(2020, 0, 1),
			dateUpdated: undefined,
		});

		expect('modifiedTime' in article).toBe(false);
	});

	test('normalizes both dates to UTC instants', () => {
		const dateCreated = new Date(Date.UTC(2020, 0, 1, 12, 30));
		const dateUpdated = new Date(Date.UTC(2021, 5, 2, 8));

		expect(getSeoArticleProps({ dateCreated, dateUpdated })).toStrictEqual({
			ogType: 'article',
			article: {
				publishedTime: '2020-01-01T12:30:00.000Z',
				modifiedTime: '2021-06-02T08:00:00.000Z',
			},
		});
	});
});

describe('getSeoImageProps', () => {
	test('returns an absolute URL, since crawlers do not resolve relative card images', () => {
		const { url } = getSeoImageProps({ id: 'some-post', alt: 'Some post' });

		expect(url.startsWith(`${site}/`)).toBe(true);
	});

	test('flattens a nested id so the card path stays one segment deep', () => {
		const nested = getSeoImageProps({ id: 'taiwan/taipei/some-location', alt: 'Alt' });
		const flat = getSeoImageProps({ id: 'taiwan-taipei-some-location', alt: 'Alt' });

		expect(nested.url).toBe(flat.url);
	});

	test('carries the deployment base path', () => {
		vi.stubEnv('BASE_URL', '/preview/');

		expect(getSeoImageProps({ id: 'some-post', alt: 'Alt' }).url).toContain('/preview/');
	});

	test('passes alt text through unchanged', () => {
		expect(getSeoImageProps({ id: 'some-post', alt: 'A caption' }).alt).toBe('A caption');
	});
});

describe('getSeoHideSearch', () => {
	test('yields nothing to spread unless hiding is asked for', () => {
		expect(getSeoHideSearch(false)).toBeUndefined();
		expect(getSeoHideSearch(undefined)).toBeUndefined();
		expect({ ...getSeoHideSearch(false) }).toStrictEqual({});
	});

	test('hiding sets both directives, since noindex alone still passes link equity', () => {
		expect(getSeoHideSearch(true)).toStrictEqual({ noIndex: true, noFollow: true });
	});
});
