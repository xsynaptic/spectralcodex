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

	test('associates what the per-resource scans it replaced associated', () => {
		const resources = [
			makeResource('taipei-times', 'taipeitimes.com'),
			makeResource('heritage-bureau', ['bunka.go.jp', 'boch.gov.tw']),
			makeResource('taiwan-in-time'),
			makeResource('unused', 'nowhere.invalid'),
		];

		const locations = [
			makeContent('alpha', { links: ['https://www.taipeitimes.com/a'] }),
			makeContent('beta', {
				links: [{ url: 'https://nchdb.boch.gov.tw/b' }],
				sources: ['taiwan-in-time'],
			}),
			makeContent('gamma', { sources: [{ title: 'Inline', resourceType: 'book' }] }),
			makeContent('delta'),
			makeContent('epsilon', { links: ['https://www.taipeitimes.com/e'], sources: ['missing'] }),
		];

		const posts = [
			makeContent('post-one', { sources: ['taiwan-in-time'] }),
			makeContent('post-two', { links: ['https://bunka.go.jp/x'] }),
		];

		const association = buildResourceAssociation(resources, locations, posts);

		// The predicate as it was written before the single pass, run per resource over each collection
		function idsByOldScan(
			content: typeof locations,
			resource: (typeof resources)[number],
		): Array<string> {
			const matchPattern = resource.data.match;

			return content
				.filter((contentEntry) => {
					const hasLinkMatch =
						!!matchPattern &&
						!!contentEntry.data.links?.some((link) => {
							const linkUrl = typeof link === 'string' ? link : link.url;

							return typeof matchPattern === 'string'
								? linkUrl.includes(matchPattern)
								: matchPattern.some((pattern) => linkUrl.includes(pattern));
						});

					const hasSourceMatch = contentEntry.data.sources?.some((source) =>
						typeof source === 'string' ? source === resource.id : false,
					);

					return hasLinkMatch || hasSourceMatch;
				})
				.map((contentEntry) => contentEntry.id);
		}

		for (const resource of resources) {
			expect(association.locationIdsByResourceId.get(resource.id)).toEqual(
				idsByOldScan(locations, resource),
			);
			expect(association.postIdsByResourceId.get(resource.id)).toEqual(
				idsByOldScan(posts, resource),
			);
		}
	});
});
