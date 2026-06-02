import { describe, expect, test } from 'vitest';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

import {
	createContentMetadataIndex,
	sortContentMetadataByDate,
	sortContentMetadataByQuality,
} from '#lib/metadata/metadata-index-core.ts';

function makeItem(
	overrides: Partial<ContentMetadataItem> & Pick<ContentMetadataItem, 'id' | 'collection'>,
): ContentMetadataItem {
	return {
		title: overrides.id,
		titleMultilingual: undefined,
		url: `/${overrides.id}`,
		imageId: undefined,
		regionPrimaryId: undefined,
		postCount: undefined,
		locationCount: undefined,
		linksCount: undefined,
		wordCount: undefined,
		backlinks: new Set<string>(),
		dateCreated: new Date('2020-01-01'),
		dateUpdated: undefined,
		dateVisited: undefined,
		entryQuality: 3,
		...overrides,
	};
}

const ids = (items: ReadonlyArray<ContentMetadataItem>) => items.map((item) => item.id);

describe('byCollection', () => {
	const contentIndex = createContentMetadataIndex([
		makeItem({ id: 'a', collection: 'posts' }),
		makeItem({ id: 'b', collection: 'locations' }),
		makeItem({ id: 'c', collection: 'posts' }),
	]);

	test('returns items from the named collections in source order', () => {
		expect(ids(contentIndex.byCollection('posts'))).toEqual(['a', 'c']);
		expect(ids(contentIndex.byCollection('posts', 'locations'))).toEqual(['a', 'b', 'c']);
	});

	test('returns an empty array when no collection matches', () => {
		expect(contentIndex.byCollection('notes')).toEqual([]);
	});
});

describe('comparators', () => {
	const newer = makeItem({ id: 'newer', collection: 'posts', dateCreated: new Date('2024-01-01') });
	const older = makeItem({ id: 'older', collection: 'posts', dateCreated: new Date('2021-01-01') });
	const updatedRecently = makeItem({
		id: 'updated-recently',
		collection: 'posts',
		dateCreated: new Date('2019-01-01'),
		dateUpdated: new Date('2025-01-01'),
	});
	const lowNew = makeItem({
		id: 'low-new',
		collection: 'posts',
		entryQuality: 2,
		dateCreated: new Date('2024-01-01'),
	});
	const highOld = makeItem({
		id: 'high-old',
		collection: 'posts',
		entryQuality: 5,
		dateCreated: new Date('2020-01-01'),
	});
	const highNew = makeItem({
		id: 'high-new',
		collection: 'posts',
		entryQuality: 5,
		dateCreated: new Date('2023-01-01'),
	});

	test('sortContentMetadataByDate is newest first, preferring dateUpdated over dateCreated', () => {
		// updatedRecently has an old dateCreated but a recent dateUpdated, so it sorts first
		expect(ids([older, newer, updatedRecently].sort(sortContentMetadataByDate))).toEqual([
			'updated-recently',
			'newer',
			'older',
		]);
	});

	test('sortContentMetadataByQuality is highest quality first, newest on ties', () => {
		expect(ids([lowNew, highOld, highNew].sort(sortContentMetadataByQuality))).toEqual([
			'high-new',
			'high-old',
			'low-new',
		]);
	});
});

describe('lookups', () => {
	const contentIndex = createContentMetadataIndex([
		makeItem({ id: 'a', collection: 'posts', title: 'Post A' }),
	]);

	test('getCaption projects the caption shape, undefined on miss', () => {
		expect(contentIndex.getCaption('a')).toEqual({
			title: 'Post A',
			titleMultilingual: undefined,
			id: 'a',
			url: '/a',
		});
		expect(contentIndex.getCaption('nope')).toBeUndefined();
	});

	test('resolve returns items in entry order, throws on miss with the id', () => {
		expect(ids(contentIndex.resolve([{ id: 'a', collection: 'posts' }] as never))).toEqual(['a']);
		expect(() => contentIndex.resolve([{ id: 'gone', collection: 'posts' }] as never)).toThrow(
			/gone/,
		);
	});
});

describe('backlinksOf', () => {
	const contentIndex = createContentMetadataIndex([
		makeItem({
			id: 'target',
			collection: 'posts',
			backlinks: new Set(['linker-post', 'linker-region', 'linker-note']),
		}),
		makeItem({ id: 'linker-post', collection: 'posts', dateCreated: new Date('2023-01-01') }),
		makeItem({ id: 'linker-note', collection: 'notes', dateCreated: new Date('2024-01-01') }),
		// regions are not a linkable backlink collection, so this one is filtered out
		makeItem({ id: 'linker-region', collection: 'regions' }),
	]);

	test('returns backlinks from linkable collections, newest first', () => {
		expect(ids(contentIndex.backlinksOf('target'))).toEqual(['linker-note', 'linker-post']);
	});

	test('returns an empty array for an unknown or backlink-free id', () => {
		expect(contentIndex.backlinksOf('nope')).toEqual([]);
		expect(contentIndex.backlinksOf('linker-post')).toEqual([]);
	});
});
