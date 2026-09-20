import { describe, expect, test } from 'vitest';

import { validateLocationsOverlap } from '#validate-content/locations-overlap.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

// About 0.00001 degrees of latitude is 1.1m at this latitude
function makePoint(id: string, lat: number, lng = 121.5) {
	return makeEntry({ data: { geometry: { coordinates: [lng, lat] } }, id });
}

describe('validateLocationsOverlap', () => {
	test('passes when no two locations sit within the threshold', () => {
		const entries = [makePoint('a', 25.05), makePoint('b', 25.055)];

		expect(validateLocationsOverlap(entries, 10)).toEqual({
			issues: [],
			status: 'pass',
			summary: 'No overlapping locations found (checked 2 locations, 2 points)',
		});
	});

	test('warns on a pair within the threshold, reported once', () => {
		const entries = [makePoint('a', 25.05), makePoint('b', 25.05005)];

		const result = validateLocationsOverlap(entries, 10);

		expect(result.status).toBe('warn');
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]?.message).toMatch(/^a: overlaps b \(5\.\dm\)$/);
	});

	test('reports every distinct pair, nearest first', () => {
		const entries = [
			makePoint('a', 25.05),
			makePoint('b', 25.05005), // about 5.5m from 'a'
			makePoint('c', 25.06),
			makePoint('d', 25.06002), // about 2.2m from 'c', and a kilometre from the others
		];

		const result = validateLocationsOverlap(entries, 10);

		expect(result.issues.map((issue) => issue.message)).toEqual([
			expect.stringMatching(/^c: overlaps d \(2\.\dm\)$/),
			expect.stringMatching(/^a: overlaps b \(5\.\dm\)$/),
		]);
		expect(result.summary).toBe('Found 2 overlap(s) (checked 4 locations, 4 points)');
	});

	test('an entry with no usable geometry is left out of the count', () => {
		const entries = [makeEntry({ data: {}, id: 'no-geometry' }), makePoint('a', 25.05)];

		expect(validateLocationsOverlap(entries, 10).summary).toBe(
			'No overlapping locations found (checked 1 locations, 1 points)',
		);
	});

	test('never reports a location against its own points', () => {
		const entries = [
			makeEntry({
				data: {
					geometry: [{ coordinates: [121.5, 25.05] }, { coordinates: [121.5, 25.05001] }],
				},
				id: 'complex',
			}),
		];

		expect(validateLocationsOverlap(entries, 10)).toEqual({
			issues: [],
			status: 'pass',
			summary: 'No overlapping locations found (checked 1 locations, 2 points)',
		});
	});
});
