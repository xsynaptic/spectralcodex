import { describe, expect, test } from 'vitest';

import { getPublicId, getRegionParentsById, toReferenceIds } from './entries.ts';

describe('toReferenceIds', () => {
	test('extracts ids from reference objects', () => {
		const references = [
			{ id: 'ruins', collection: 'themes' },
			{ id: 'temples', collection: 'themes' },
		];

		expect(toReferenceIds(references)).toEqual(['ruins', 'temples']);
	});

	test('returns an empty array for anything that is not an array', () => {
		expect(toReferenceIds(undefined)).toEqual([]);
		expect(toReferenceIds('ruins')).toEqual([]);
		expect(toReferenceIds({ id: 'ruins' })).toEqual([]);
	});

	test('drops items without a string id', () => {
		const references = [{ id: 'ruins' }, { collection: 'themes' }, undefined, 42, { id: 7 }];

		expect(toReferenceIds(references)).toEqual(['ruins']);
	});
});

describe('getPublicId', () => {
	test('returns the entry id when there is no override', () => {
		expect(getPublicId({ id: 'real-place', data: {} })).toBe('real-place');
	});

	test('returns the override id for an anonymized entry', () => {
		expect(getPublicId({ id: 'real-place', data: { override: { id: 'anon-42' } } })).toBe(
			'anon-42',
		);
	});
});

describe('getRegionParentsById', () => {
	const parentMap = new Map([
		['asia', undefined],
		['taiwan', 'asia'],
		['taipei', 'taiwan'],
	]);

	test('returns the chain from root down to the region itself', () => {
		expect(getRegionParentsById('taipei', parentMap)).toEqual(['asia', 'taiwan', 'taipei']);
	});

	test('returns an empty array without a region id', () => {
		expect(getRegionParentsById(undefined, parentMap)).toEqual([]);
	});
});
