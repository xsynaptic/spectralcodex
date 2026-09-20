import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	buildArticleSchema,
	buildAuthorSchema,
	buildEntryBreadcrumbSchema,
	buildPlaceSchema,
	buildWebSiteSchema,
	serializeGraph,
} from '#lib/utils/seo-structured-data.ts';

const site = 'https://spectralcodex.com';

// Reaching for astro:content in a unit test pulls in the content layer; infer the shape instead
type RegionEntry = NonNullable<Parameters<typeof buildEntryBreadcrumbSchema>[0]['regions']>[number];

const makeRegion = (id: string, title: string) =>
	({ data: { title }, id }) as unknown as RegionEntry;

beforeEach(() => {
	vi.stubEnv('SITE', site);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('serializeGraph', () => {
	test('a title carrying a closing script tag cannot break out', () => {
		const output = serializeGraph([
			buildPlaceSchema({
				coordinates: undefined,
				description: undefined,
				title: 'Ghost </script> & Co',
				url: '/locations/ghost/',
			}),
		]);

		expect(output).not.toContain('<');
		expect(output).not.toContain('>');
		expect(output).not.toContain('&');
		expect(output).toContain(String.raw`\u003c/script\u003e \u0026 Co`);
	});

	test('the escaped output still parses back to the original graph', () => {
		const parsed = JSON.parse(serializeGraph([buildWebSiteSchema()])) as {
			'@context': string;
			'@graph': Array<{ '@type': string; name: string }>;
		};

		expect(parsed['@context']).toBe('https://schema.org');
		expect(parsed['@graph']).toHaveLength(1);
		expect(parsed['@graph'][0]?.['@type']).toBe('WebSite');
		expect(parsed['@graph'][0]?.name).toBe('Spectral Codex');
	});
});

// The graph hangs together by @id reference, and a broken link is invisible to e2e
describe('@id scheme', () => {
	const personId = `${site}/about/#/schema.org/Person`;

	test('singletons get a long-form @id, per-page entities a fragment', () => {
		const website = buildWebSiteSchema();

		expect(website['@id']).toBe(`${site}/#/schema.org/WebSite`);
		expect(website.publisher['@id']).toBe(personId);
		expect(buildAuthorSchema()['@id']).toBe(personId);
	});

	test('an article and its breadcrumb hang off the same page url', () => {
		const article = buildArticleSchema({
			dateCreated: new Date(Date.UTC(2020, 0, 1)),
			dateUpdated: undefined,
			description: undefined,
			imageUrl: undefined,
			title: 'A post',
			url: '/posts/a-post/',
		});
		const breadcrumb = buildEntryBreadcrumbSchema({
			collection: 'locations',
			title: 'A post',
			url: '/posts/a-post/',
		});

		expect(article['@id']).toBe(`${site}/posts/a-post/#article`);
		expect(breadcrumb['@id']).toBe(`${site}/posts/a-post/#breadcrumb`);
	});
});

describe('buildPlaceSchema', () => {
	const taipei: [number, number] = [121.5654, 25.033];

	test('reads coordinates as [lng, lat]', () => {
		const place = buildPlaceSchema({
			coordinates: taipei,
			description: undefined,
			title: 'Taipei',
			url: '/locations/taipei/',
		});

		expect(place.geo).toStrictEqual({
			'@type': 'GeoCoordinates',
			latitude: 25.033,
			longitude: 121.5654,
		});
	});

	test('builds its @id and url from the page path', () => {
		const place = buildPlaceSchema({
			coordinates: taipei,
			description: undefined,
			title: 'Taipei',
			url: '/locations/taipei/',
		});

		expect(place['@id']).toBe(`${site}/locations/taipei/#place`);
		expect(place.url).toBe(`${site}/locations/taipei/`);
	});

	test('omits geo and description rather than emitting undefined', () => {
		const place = buildPlaceSchema({
			coordinates: undefined,
			description: undefined,
			title: 'Taipei',
			url: '/locations/taipei/',
		});

		expect('geo' in place).toBe(false);
		expect('description' in place).toBe(false);
	});
});

describe('buildArticleSchema', () => {
	const dateCreated = new Date(Date.UTC(2020, 0, 1, 12, 30));

	test('omits description, image, and dateModified when absent', () => {
		const article = buildArticleSchema({
			dateCreated,
			dateUpdated: undefined,
			description: undefined,
			imageUrl: undefined,
			title: 'A post',
			url: '/posts/a-post/',
		});

		expect('description' in article).toBe(false);
		expect('image' in article).toBe(false);
		expect('dateModified' in article).toBe(false);
		expect(article.datePublished).toBe('2020-01-01T12:30:00.000Z');
		expect(article.author['@id']).toBe(`${site}/about/#/schema.org/Person`);
	});

	test('carries description, image, and dateModified when present', () => {
		const article = buildArticleSchema({
			dateCreated,
			dateUpdated: new Date(Date.UTC(2021, 5, 2, 8)),
			description: 'About a place',
			imageUrl: 'https://example.com/a.jpg',
			title: 'A post',
			url: '/posts/a-post/',
		});

		expect(article.description).toBe('About a place');
		expect(article.image).toBe('https://example.com/a.jpg');
		expect(article.dateModified).toBe('2021-06-02T08:00:00.000Z');
	});
});

describe('buildAuthorSchema', () => {
	test('omits sameAs when no profiles are given', () => {
		expect('sameAs' in buildAuthorSchema()).toBe(false);
		expect('sameAs' in buildAuthorSchema({ sameAs: [] })).toBe(false);
	});

	test('carries the profiles it is given', () => {
		expect(buildAuthorSchema({ sameAs: ['https://example.com/me'] }).sameAs).toStrictEqual([
			'https://example.com/me',
		]);
	});
});

const trail = (regions?: Array<RegionEntry>) =>
	buildEntryBreadcrumbSchema({
		collection: 'locations',
		regions,
		title: 'Xinyi Market',
		url: '/locations/xinyi-market/',
	}).itemListElement;

describe('buildEntryBreadcrumbSchema', () => {
	test('runs site, collection, regions root first, then the entry', () => {
		const items = trail([makeRegion('taiwan', 'Taiwan'), makeRegion('taipei', 'Taipei')]);

		expect(items.map((item) => item.name)).toStrictEqual([
			'Spectral Codex',
			'Locations',
			'Taiwan',
			'Taipei',
			'Xinyi Market',
		]);
	});

	test('numbers the trail from one, in array order', () => {
		const items = trail([makeRegion('taiwan', 'Taiwan'), makeRegion('taipei', 'Taipei')]);

		expect(items.map((item) => item.position)).toStrictEqual([1, 2, 3, 4, 5]);
	});

	test('every crumb but the last carries an absolute link', () => {
		const items = trail([makeRegion('taiwan', 'Taiwan')]);

		expect(items.map((item) => item.item)).toStrictEqual([
			`${site}/`,
			`${site}/locations/`,
			`${site}/regions/taiwan/`,
			undefined,
		]);
		expect('item' in items.at(-1)!).toBe(false);
	});

	test('an entry with no regions still gets site, collection, and itself', () => {
		expect(trail().map((item) => item.name)).toStrictEqual([
			'Spectral Codex',
			'Locations',
			'Xinyi Market',
		]);
	});
});
