import { describe, expect, test } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';
import { sortCatalogByDate, sortCatalogByQuality } from '#lib/catalog/catalog-utils.ts';

const ids = (items: ReadonlyArray<CatalogItem>) => items.map((item) => item.id);

describe('byCollection', () => {
	const catalog = createCatalog([
		makeCatalogItem({ id: 'a', collection: 'posts' }),
		makeCatalogItem({ id: 'b', collection: 'locations' }),
		makeCatalogItem({ id: 'c', collection: 'posts' }),
	]);

	test('returns items from the named collections in source order', () => {
		expect(ids(catalog.byCollection('posts'))).toEqual(['a', 'c']);
		expect(ids(catalog.byCollection('posts', 'locations'))).toEqual(['a', 'b', 'c']);
	});

	test('returns an empty array when no collection matches', () => {
		expect(catalog.byCollection('notes')).toEqual([]);
	});
});

describe('comparators', () => {
	const newer = makeCatalogItem({
		id: 'newer',
		collection: 'posts',
		dateCreated: new Date('2024-01-01'),
	});
	const older = makeCatalogItem({
		id: 'older',
		collection: 'posts',
		dateCreated: new Date('2021-01-01'),
	});
	const updatedRecently = makeCatalogItem({
		id: 'updated-recently',
		collection: 'posts',
		dateCreated: new Date('2019-01-01'),
		dateUpdated: new Date('2025-01-01'),
	});
	const lowNew = makeCatalogItem({
		id: 'low-new',
		collection: 'posts',
		entryQuality: 2,
		dateCreated: new Date('2024-01-01'),
	});
	const highOld = makeCatalogItem({
		id: 'high-old',
		collection: 'posts',
		entryQuality: 5,
		dateCreated: new Date('2020-01-01'),
	});
	const highNew = makeCatalogItem({
		id: 'high-new',
		collection: 'posts',
		entryQuality: 5,
		dateCreated: new Date('2023-01-01'),
	});

	test('sortCatalogByDate is newest first, preferring dateUpdated over dateCreated', () => {
		expect(ids([older, newer, updatedRecently].sort(sortCatalogByDate))).toEqual([
			'updated-recently',
			'newer',
			'older',
		]);
	});

	test('sortCatalogByQuality is highest quality first, newest on ties', () => {
		expect(ids([lowNew, highOld, highNew].sort(sortCatalogByQuality))).toEqual([
			'high-new',
			'high-old',
			'low-new',
		]);
	});
});

describe('lookups', () => {
	const catalog = createCatalog([
		makeCatalogItem({ id: 'a', collection: 'posts', title: 'Post A' }),
	]);

	test('getCaption projects the caption shape, undefined on miss', () => {
		expect(catalog.getCaption('a')).toEqual({
			title: 'Post A',
			titleMultilingual: undefined,
			id: 'a',
			url: '/a',
		});
		expect(catalog.getCaption('nope')).toBeUndefined();
	});

	test('resolve returns items in entry order, throws on miss with the id', () => {
		expect(ids(catalog.resolve([{ id: 'a', collection: 'posts' }] as never))).toEqual(['a']);
		expect(() => catalog.resolve([{ id: 'gone', collection: 'posts' }] as never)).toThrow(/gone/);
	});
});

describe('backlinksOf', () => {
	const catalog = createCatalog([
		makeCatalogItem({
			id: 'target',
			collection: 'posts',
			backlinks: new Set(['linker-post', 'linker-region', 'linker-note']),
		}),
		makeCatalogItem({
			id: 'linker-post',
			collection: 'posts',
			dateCreated: new Date('2023-01-01'),
		}),
		makeCatalogItem({
			id: 'linker-note',
			collection: 'notes',
			dateCreated: new Date('2024-01-01'),
		}),
		// Regions are not a linkable backlink collection, so this one is filtered out
		makeCatalogItem({ id: 'linker-region', collection: 'regions' }),
	]);

	test('returns backlinks from linkable collections, newest first', () => {
		expect(ids(catalog.backlinksOf('target'))).toEqual(['linker-note', 'linker-post']);
	});

	test('returns an empty array for an unknown or backlink-free id', () => {
		expect(catalog.backlinksOf('nope')).toEqual([]);
		expect(catalog.backlinksOf('linker-post')).toEqual([]);
	});
});
