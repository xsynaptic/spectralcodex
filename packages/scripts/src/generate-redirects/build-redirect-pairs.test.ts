import { describe, expect, test } from 'vitest';

import type { DataStoreCollections, DataStoreEntry } from '../shared/data-store';

import { makeEntry } from '../validate-content/validate-test-utils';
import { buildRedirectPairs } from './build-redirect-pairs';

// Fixtures must carry all collections; getDataStoreCollection throws on a missing one
const ALL_COLLECTIONS = [
	'locations',
	'posts',
	'notes',
	'pages',
	'themes',
	'series',
	'regions',
	'resources',
];

function makeCollections(
	populated: Record<string, Array<DataStoreEntry>> = {},
): DataStoreCollections {
	const collections: DataStoreCollections = new Map();

	for (const name of ALL_COLLECTIONS) {
		const entries = new Map<string, DataStoreEntry>();
		const populatedEntries = populated[name] ?? [];

		for (const entry of populatedEntries) {
			entries.set(entry.id, entry);
		}

		collections.set(name, entries);
	}

	return collections;
}

describe('buildRedirectPairs', () => {
	test('emits a page redirect and an OG-image redirect per formerId (flat collection)', () => {
		const collections = makeCollections({
			locations: [makeEntry({ id: 'new-id', data: { formerIds: ['old-id'] } })],
		});

		expect(buildRedirectPairs(collections)).toEqual([
			{ fromPath: '/old-id/', toPath: '/new-id/' },
			{ fromPath: '/og/old-id.jpg', toPath: '/og/new-id.jpg' },
		]);
	});

	test('prefixes page paths for prefixed collections but keeps OG paths flat', () => {
		const collections = makeCollections({
			themes: [makeEntry({ id: 'new-theme', data: { formerIds: ['old-theme'] } })],
		});

		expect(buildRedirectPairs(collections)).toEqual([
			{ fromPath: '/themes/old-theme/', toPath: '/themes/new-theme/' },
			{ fromPath: '/og/old-theme.jpg', toPath: '/og/new-theme.jpg' },
		]);
	});

	test('emits a pair for each of several formerIds', () => {
		const collections = makeCollections({
			posts: [makeEntry({ id: 'current', data: { formerIds: ['old-a', 'old-b'] } })],
		});

		expect(buildRedirectPairs(collections)).toEqual([
			{ fromPath: '/old-a/', toPath: '/current/' },
			{ fromPath: '/og/old-a.jpg', toPath: '/og/current.jpg' },
			{ fromPath: '/old-b/', toPath: '/current/' },
			{ fromPath: '/og/old-b.jpg', toPath: '/og/current.jpg' },
		]);
	});

	test('targets the override id for anonymized locations, never the real entry id', () => {
		const collections = makeCollections({
			locations: [
				makeEntry({
					id: 'real-name',
					data: { formerIds: ['old-slug'], override: { id: 'anon-42' } },
				}),
			],
		});

		expect(buildRedirectPairs(collections)).toEqual([
			{ fromPath: '/old-slug/', toPath: '/anon-42/' },
			{ fromPath: '/og/old-slug.jpg', toPath: '/og/anon-42.jpg' },
		]);
	});

	test('skips a formerId that equals the canonical (public) id', () => {
		const collections = makeCollections({
			locations: [
				makeEntry({ id: 'self', data: { formerIds: ['self'] } }),
				makeEntry({ id: 'real', data: { formerIds: ['anon'], override: { id: 'anon' } } }),
			],
		});

		expect(buildRedirectPairs(collections)).toEqual([]);
	});

	test('ignores entries without formerIds', () => {
		const collections = makeCollections({
			locations: [makeEntry({ id: 'plain', data: {} })],
		});

		expect(buildRedirectPairs(collections)).toEqual([]);
	});
});
