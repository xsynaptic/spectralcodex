import { describe, expect, test } from 'vitest';

import { collectDuplicateIdIssues } from '#validate-content/entry-ids.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

describe('collectDuplicateIdIssues', () => {
	test('accepts distinct IDs', () => {
		const entries = [makeEntry({ id: 'taipei' }), makeEntry({ id: 'tainan' })];

		expect(collectDuplicateIdIssues(entries)).toEqual([]);
	});

	test('flags the same ID claimed by two entries', () => {
		const entries = [
			makeEntry({ id: 'taipei', filePath: 'regions/taipei.mdx' }),
			makeEntry({ id: 'taipei', filePath: 'themes/taipei.mdx' }),
		];

		expect(collectDuplicateIdIssues(entries)).toEqual([
			{ id: 'taipei', locations: ['regions/taipei.mdx', 'themes/taipei.mdx'] },
		]);
	});

	test('flags an override ID that collides with another entry', () => {
		const entries = [
			makeEntry({ id: 'secret-place', data: { override: { id: 'taipei' } } }),
			makeEntry({ id: 'taipei' }),
		];

		expect(collectDuplicateIdIssues(entries)).toEqual([
			{ id: 'taipei', locations: ['secret-place', 'taipei'] },
		]);
	});

	test('an override does not collide with the entry it belongs to', () => {
		const entries = [makeEntry({ id: 'taipei', data: { override: { id: 'taipei' } } })];

		expect(collectDuplicateIdIssues(entries)).toEqual([]);
	});

	test('an entry with an override still claims its own ID', () => {
		const entries = [
			makeEntry({ id: 'taipei', data: { override: { id: 'somewhere-else' } } }),
			makeEntry({ id: 'taipei' }),
		];

		expect(collectDuplicateIdIssues(entries)).toEqual([
			{ id: 'taipei', locations: ['taipei', 'taipei'] },
		]);
	});
});
