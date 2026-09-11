import { describe, expect, test } from 'vitest';

import { validateLocationsDuplicates } from '#validate-content/locations-duplicates.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

describe('validateLocationsDuplicates', () => {
	test('passes when every checked field is distinct', () => {
		const entries = [
			makeEntry({ id: 'a', data: { title: 'Alpha Theater', title_zh: '甲戲院' } }),
			makeEntry({ id: 'b', data: { title: 'Beta Theater', title_zh: '乙戲院' } }),
		];

		expect(validateLocationsDuplicates(entries)).toEqual({
			status: 'pass',
			summary: 'No duplicates found (checked 2 locations)',
			issues: [],
		});
	});

	test('flags the second occurrence of a repeated field, never the first', () => {
		const entries = [
			makeEntry({ id: 'a', data: { title: 'Same Theater' } }),
			makeEntry({ id: 'b', data: { title: 'Same Theater' } }),
		];

		expect(validateLocationsDuplicates(entries)).toEqual({
			status: 'fail',
			summary: 'Found 1 duplicate(s)',
			issues: [{ message: 'b: duplicate title "Same Theater"' }],
		});
	});

	test('flags a repeated Google Maps link across string and object link forms', () => {
		const url = 'https://maps.app.goo.gl/abc123';
		const entries = [
			makeEntry({ id: 'a', data: { links: [url] } }),
			makeEntry({ id: 'b', data: { links: ['https://example.test', { url }] } }),
		];

		expect(validateLocationsDuplicates(entries).issues).toEqual([
			{ message: `b: duplicate Google Maps link "${url}"` },
		]);
	});
});
