import { describe, expect, test } from 'vitest';

import { validateLocationsDuplicates } from '#validate-content/locations-duplicates.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

describe('validateLocationsDuplicates', () => {
	test('passes when every checked field is distinct', () => {
		const entries = [
			makeEntry({ data: { title: 'Alpha Theater', title_zh: '甲戲院' }, id: 'a' }),
			makeEntry({ data: { title: 'Beta Theater', title_zh: '乙戲院' }, id: 'b' }),
		];

		expect(validateLocationsDuplicates(entries)).toEqual({
			issues: [],
			status: 'pass',
			summary: 'No duplicates found (checked 2 locations)',
		});
	});

	test('flags the second occurrence of a repeated field, never the first', () => {
		const entries = [
			makeEntry({ data: { title: 'Same Theater' }, id: 'a' }),
			makeEntry({ data: { title: 'Same Theater' }, id: 'b' }),
		];

		expect(validateLocationsDuplicates(entries)).toEqual({
			issues: [{ message: 'b: duplicate title "Same Theater"' }],
			status: 'fail',
			summary: 'Found 1 duplicate(s)',
		});
	});

	test('flags a repeated Google Maps link across string and object link forms', () => {
		const url = 'https://maps.app.goo.gl/abc123';
		const entries = [
			makeEntry({ data: { links: [url] }, id: 'a' }),
			makeEntry({ data: { links: ['https://example.test', { url }] }, id: 'b' }),
		];

		expect(validateLocationsDuplicates(entries).issues).toEqual([
			{ message: `b: duplicate Google Maps link "${url}"` },
		]);
	});
});
