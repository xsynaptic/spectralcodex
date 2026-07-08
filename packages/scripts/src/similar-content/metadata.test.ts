import { describe, expect, test } from 'vitest';

import { calculateMetadataBoost, toReferenceIdArray } from './metadata';

function makeEmbedding(themes: Array<string>, regions: Array<string>) {
	return { metadata: { themes, regions } };
}

describe('toReferenceIdArray', () => {
	test('extracts ids from data-store reference objects', () => {
		const references = [
			{ id: 'ruins', collection: 'themes' },
			{ id: 'temples', collection: 'themes' },
		];

		expect(toReferenceIdArray(references)).toEqual(['ruins', 'temples']);
	});

	test('passes plain strings through', () => {
		expect(toReferenceIdArray(['ruins', 'temples'])).toEqual(['ruins', 'temples']);
	});

	test('returns an empty array for undefined', () => {
		expect(toReferenceIdArray(undefined)).toEqual([]);
	});

	test('returns an empty array for non-array values', () => {
		expect(toReferenceIdArray('ruins')).toEqual([]);
		expect(toReferenceIdArray({ id: 'ruins' })).toEqual([]);
	});

	test('drops items without an id', () => {
		expect(toReferenceIdArray([{ collection: 'themes' }, undefined, 42])).toEqual([]);
	});

	test('never emits "[object Object]"', () => {
		const references = [{ id: 'ruins', collection: 'themes' }, { collection: 'themes' }];

		expect(toReferenceIdArray(references)).not.toContain('[object Object]');
	});
});

describe('calculateMetadataBoost', () => {
	test('one shared theme scores 0.15', () => {
		const current = makeEmbedding(['ruins'], []);
		const other = makeEmbedding(['ruins'], []);

		expect(calculateMetadataBoost(current, other)).toBeCloseTo(0.15);
	});

	test('shared theme and region scores 0.25', () => {
		const current = makeEmbedding(['ruins'], ['taiwan']);
		const other = makeEmbedding(['ruins'], ['taiwan']);

		expect(calculateMetadataBoost(current, other)).toBeCloseTo(0.25);
	});

	test('four shared themes cap at 0.3', () => {
		const themes = ['ruins', 'temples', 'railways', 'theaters'];
		const current = makeEmbedding(themes, []);
		const other = makeEmbedding(themes, []);

		expect(calculateMetadataBoost(current, other)).toBe(0.3);
	});

	test('nothing shared scores 0', () => {
		const current = makeEmbedding(['ruins'], ['taiwan']);
		const other = makeEmbedding(['temples'], ['vietnam']);

		expect(calculateMetadataBoost(current, other)).toBe(0);
	});
});
