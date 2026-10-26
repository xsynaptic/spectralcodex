import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getSeoArticleProps, getSeoImageProps } from '#lib/utils/seo.ts';

const site = 'https://spectralcodex.com';

beforeEach(() => {
	vi.stubEnv('SITE', site);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('getSeoArticleProps', () => {
	const dateCreated = new Date(Date.UTC(2020, 0, 1, 12, 30));

	test.each([
		{
			article: { publishedTime: '2020-01-01T12:30:00.000Z' },
			dateUpdated: undefined,
		},
		{
			article: {
				modifiedTime: '2021-06-02T08:00:00.000Z',
				publishedTime: '2020-01-01T12:30:00.000Z',
			},
			dateUpdated: new Date(Date.UTC(2021, 5, 2, 8)),
		},
	])('carries a modified time only when updated: $dateUpdated', ({ article, dateUpdated }) => {
		expect(getSeoArticleProps({ dateCreated, dateUpdated })).toStrictEqual({
			article,
			ogType: 'article',
		});
	});
});

describe('getSeoImageProps', () => {
	test('builds an absolute, base-prefixed card URL from a flattened id', () => {
		vi.stubEnv('BASE_URL', '/preview/');

		expect(getSeoImageProps({ alt: 'Alt', id: 'taiwan/taipei/some-location' }).url).toBe(
			`${site}/preview/og/taiwan-taipei-some-location.jpg`,
		);
	});
});
