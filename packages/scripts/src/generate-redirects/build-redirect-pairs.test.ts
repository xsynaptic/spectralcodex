import { describe, expect, test } from 'vitest';

import { buildRedirectPairs } from '#generate-redirects/build-redirect-pairs.ts';

function makeEntry(
	id: string,
	collection: string,
	data: { formerIds?: Array<string>; override?: { id: string } } = {},
) {
	return { collection, data, id };
}

describe('buildRedirectPairs', () => {
	test('emits a page redirect and an OG-image redirect per formerId (flat collection)', () => {
		expect(
			buildRedirectPairs([makeEntry('new-id', 'locations', { formerIds: ['old-id'] })]).pairs,
		).toEqual([
			{ fromPath: '/old-id/', toPath: '/new-id/' },
			{ fromPath: '/og/old-id.jpg', toPath: '/og/new-id.jpg' },
		]);
	});

	test('prefixes page paths for prefixed collections but keeps OG paths flat', () => {
		expect(
			buildRedirectPairs([makeEntry('new-theme', 'themes', { formerIds: ['old-theme'] })]).pairs,
		).toEqual([
			{ fromPath: '/themes/old-theme/', toPath: '/themes/new-theme/' },
			{ fromPath: '/og/old-theme.jpg', toPath: '/og/new-theme.jpg' },
		]);
	});

	test('emits a pair for each of several formerIds', () => {
		expect(
			buildRedirectPairs([makeEntry('current', 'posts', { formerIds: ['old-a', 'old-b'] })]).pairs,
		).toEqual([
			{ fromPath: '/old-a/', toPath: '/current/' },
			{ fromPath: '/og/old-a.jpg', toPath: '/og/current.jpg' },
			{ fromPath: '/old-b/', toPath: '/current/' },
			{ fromPath: '/og/old-b.jpg', toPath: '/og/current.jpg' },
		]);
	});

	test('targets the override id for anonymized locations, never the real entry id', () => {
		expect(
			buildRedirectPairs([
				makeEntry('real-name', 'locations', {
					formerIds: ['old-slug'],
					override: { id: 'anon-42' },
				}),
			]).pairs,
		).toEqual([
			{ fromPath: '/old-slug/', toPath: '/anon-42/' },
			{ fromPath: '/og/old-slug.jpg', toPath: '/og/anon-42.jpg' },
		]);
	});

	test('skips a formerId that equals the canonical (public) id', () => {
		expect(
			buildRedirectPairs([
				makeEntry('self', 'locations', { formerIds: ['self'] }),
				makeEntry('real', 'locations', { formerIds: ['anon'], override: { id: 'anon' } }),
			]),
		).toEqual({ collisions: [], pairs: [], skipped: [] });
	});

	test('ignores entries without formerIds', () => {
		expect(buildRedirectPairs([makeEntry('plain', 'locations')]).pairs).toEqual([]);
	});

	// The caller chooses which collections to pass; an unprefixed one redirects flat
	test('treats a collection outside the prefix map as flat', () => {
		expect(
			buildRedirectPairs([makeEntry('img', 'images', { formerIds: ['old-img'] })]).pairs,
		).toEqual([
			{ fromPath: '/old-img/', toPath: '/img/' },
			{ fromPath: '/og/old-img.jpg', toPath: '/og/img.jpg' },
		]);
	});

	test('reports collisions with a live page or card, and skips a path already claimed', () => {
		const { collisions, pairs, skipped } = buildRedirectPairs([
			makeEntry('about', 'pages'),
			makeEntry('taipei', 'regions'),
			makeEntry('new-post', 'posts', { formerIds: ['about'] }),
			makeEntry('new-theme', 'themes', { formerIds: ['taipei'] }),
			makeEntry('first', 'locations', { formerIds: ['shared'] }),
			makeEntry('second', 'locations', { formerIds: ['shared'] }),
		]);

		expect(pairs).toEqual([
			{ fromPath: '/shared/', toPath: '/first/' },
			{ fromPath: '/og/shared.jpg', toPath: '/og/first.jpg' },
		]);
		expect(collisions).toEqual(['/about/ is a live path', '/og/taipei.jpg is a live path']);
		expect(skipped).toEqual(['/shared/ is claimed by an earlier rule']);
	});
});
