import { describe, expect, test } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';
import {
	isEditorialEntry,
	sortCatalogByDate,
	sortCatalogByEntryQuality,
} from '#lib/catalog/catalog-utils.ts';

const ids = (items: ReadonlyArray<CatalogItem>) => items.map((item) => item.id);

describe('byCollection', () => {
	const catalog = createCatalog([
		makeCatalogItem({ collection: 'posts', id: 'a' }),
		makeCatalogItem({ collection: 'locations', id: 'b' }),
		makeCatalogItem({ collection: 'posts', id: 'c' }),
	]);

	test('returns items from the named collections in source order', () => {
		expect(ids(catalog.byCollection('posts'))).toEqual(['a', 'c']);
		expect(ids(catalog.byCollection('posts', 'locations'))).toEqual(['a', 'b', 'c']);
	});
});

describe('comparators', () => {
	const newer = makeCatalogItem({
		collection: 'posts',
		dateCreated: new Date('2024-01-01'),
		id: 'newer',
	});
	const older = makeCatalogItem({
		collection: 'posts',
		dateCreated: new Date('2021-01-01'),
		id: 'older',
	});
	const updatedRecently = makeCatalogItem({
		collection: 'posts',
		dateCreated: new Date('2019-01-01'),
		dateUpdated: new Date('2025-01-01'),
		id: 'updated-recently',
	});
	const lowNew = makeCatalogItem({
		collection: 'posts',
		dateCreated: new Date('2024-01-01'),
		entryQuality: 2,
		id: 'low-new',
	});
	const highOld = makeCatalogItem({
		collection: 'posts',
		dateCreated: new Date('2020-01-01'),
		entryQuality: 5,
		id: 'high-old',
	});
	const highNew = makeCatalogItem({
		collection: 'posts',
		dateCreated: new Date('2023-01-01'),
		entryQuality: 5,
		id: 'high-new',
	});

	test('sortCatalogByDate is newest first, preferring dateUpdated over dateCreated', () => {
		expect(ids([older, newer, updatedRecently].sort(sortCatalogByDate))).toEqual([
			'updated-recently',
			'newer',
			'older',
		]);
	});

	test('sortCatalogByEntryQuality is highest quality first, newest on ties', () => {
		expect(ids([lowNew, highOld, highNew].sort(sortCatalogByEntryQuality))).toEqual([
			'high-new',
			'high-old',
			'low-new',
		]);
	});
});

describe('lookups', () => {
	const catalog = createCatalog([
		makeCatalogItem({ collection: 'posts', id: 'a', title: 'Post A' }),
	]);

	test('getCaption projects the caption shape, undefined on miss', () => {
		expect(catalog.getCaption('a')).toEqual({
			id: 'a',
			title: 'Post A',
			titleMultilingual: undefined,
			url: '/a',
		});
		expect(catalog.getCaption('nope')).toBeUndefined();
	});

	test('resolve returns items in entry order, throws on miss with the id', () => {
		expect(ids(catalog.resolve([{ collection: 'posts', id: 'a' }] as never))).toEqual(['a']);
		expect(() => catalog.resolve([{ collection: 'posts', id: 'gone' }] as never)).toThrow(/gone/);
	});
});

describe('backlinksOf', () => {
	const catalog = createCatalog([
		makeCatalogItem({
			backlinks: new Set(['linker-post', 'linker-region']),
			collection: 'posts',
			id: 'target',
		}),
		makeCatalogItem({
			collection: 'posts',
			dateCreated: new Date('2023-01-01'),
			id: 'linker-post',
		}),
		makeCatalogItem({ collection: 'regions', id: 'linker-region' }),
	]);

	test('returns every inbound link, uncapped and unfiltered, newest first', () => {
		expect(ids(catalog.backlinksOf('target'))).toEqual(['linker-post', 'linker-region']);
	});

	test('leaves narrowing to the caller', () => {
		expect(ids(catalog.backlinksOf('target').filter(isEditorialEntry))).toEqual(['linker-post']);
	});

	test('returns an empty array for an unknown or backlink-free id', () => {
		expect(catalog.backlinksOf('nope')).toEqual([]);
		expect(catalog.backlinksOf('linker-post')).toEqual([]);
	});
});
