import { describe, expect, test } from 'vitest';

import { buildResourceAssociation } from '#lib/collections/resources/resources-association.ts';

function makeResource(id: string, match?: string | Array<string>) {
	return { id, data: { match } };
}

function makeContent(
	id: string,
	data: { links?: Array<string | { url: string }>; sources?: Array<string | object> } = {},
) {
	return { id, data };
}

describe('buildResourceAssociation', () => {
	test('associates a string match pattern with a string link', () => {
		const association = buildResourceAssociation(
			[makeResource('taipei-times', 'taipeitimes.com')],
			[makeContent('some-place', { links: ['https://www.taipeitimes.com/News/feat/12345'] })],
			[],
		);

		expect(association.locationIdsByResourceId.get('taipei-times')).toEqual(['some-place']);
	});

	test('associates an array match pattern when one pattern hits', () => {
		const association = buildResourceAssociation(
			[makeResource('heritage-bureau', ['bunka.go.jp', 'boch.gov.tw'])],
			[makeContent('some-place', { links: ['https://nchdb.boch.gov.tw/assets/overview/123'] })],
			[],
		);

		expect(association.locationIdsByResourceId.get('heritage-bureau')).toEqual(['some-place']);
	});

	test('associates an object-form link by its url', () => {
		const association = buildResourceAssociation(
			[makeResource('taipei-times', 'taipeitimes.com')],
			[
				makeContent('some-place', {
					links: [{ url: 'https://www.taipeitimes.com/News/feat/12345' }],
				}),
			],
			[],
		);

		expect(association.locationIdsByResourceId.get('taipei-times')).toEqual(['some-place']);
	});

	test('associates a string source that exactly matches a resource id, with no match pattern', () => {
		const association = buildResourceAssociation(
			[makeResource('taiwan-in-time')],
			[makeContent('some-place', { sources: ['taiwan-in-time'] })],
			[],
		);

		expect(association.locationIdsByResourceId.get('taiwan-in-time')).toEqual(['some-place']);
	});

	test('ignores object-form sources', () => {
		const association = buildResourceAssociation(
			[makeResource('taiwan-in-time')],
			[
				makeContent('some-place', {
					sources: [{ title: 'Taiwan in Time', resourceType: 'article' }],
				}),
			],
			[],
		);

		expect(association.locationIdsByResourceId.get('taiwan-in-time')).toEqual([]);
	});

	test('gives an unmatched resource an empty array rather than a missing key', () => {
		const association = buildResourceAssociation(
			[makeResource('unused', 'example.com')],
			[makeContent('some-place', { links: ['https://other.example.org/'] })],
			[makeContent('some-post')],
		);

		expect(association.locationIdsByResourceId.has('unused')).toBe(true);
		expect(association.locationIdsByResourceId.get('unused')).toEqual([]);
		expect(association.postIdsByResourceId.get('unused')).toEqual([]);
	});

	test('preserves content-collection order', () => {
		const links = ['https://www.taipeitimes.com/x'];

		const association = buildResourceAssociation(
			[makeResource('taipei-times', 'taipeitimes.com')],
			[
				makeContent('zeta', { links }),
				makeContent('alpha', { links }),
				makeContent('mu', { links }),
			],
			[],
		);

		expect(association.locationIdsByResourceId.get('taipei-times')).toEqual([
			'zeta',
			'alpha',
			'mu',
		]);
	});

	test('associates one location with every resource it matches', () => {
		const association = buildResourceAssociation(
			[makeResource('taipei-times', 'taipeitimes.com'), makeResource('taiwan-in-time')],
			[
				makeContent('some-place', {
					links: ['https://www.taipeitimes.com/x'],
					sources: ['taiwan-in-time'],
				}),
			],
			[],
		);

		expect(association.locationIdsByResourceId.get('taipei-times')).toEqual(['some-place']);
		expect(association.locationIdsByResourceId.get('taiwan-in-time')).toEqual(['some-place']);
	});

	test('associates posts separately from locations', () => {
		const association = buildResourceAssociation(
			[makeResource('taipei-times', 'taipeitimes.com')],
			[makeContent('some-place', { links: ['https://www.taipeitimes.com/x'] })],
			[makeContent('some-post', { links: ['https://www.taipeitimes.com/y'] })],
		);

		expect(association.locationIdsByResourceId.get('taipei-times')).toEqual(['some-place']);
		expect(association.postIdsByResourceId.get('taipei-times')).toEqual(['some-post']);
	});
});
