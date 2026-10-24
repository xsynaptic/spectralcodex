import { describe, expect, test } from 'vitest';

import { validateLocationsPointTitles } from '#validate-content/locations-point-titles.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const coordinates = [121.5, 25];

describe('validateLocationsPointTitles', () => {
	test('passes when each Point title is distinct within its Location, whatever other Locations use', () => {
		const entries = [
			makeEntry({
				data: {
					geometry: [
						{ coordinates, title: 'North Entrance', title_zh: '北口' },
						{ coordinates, title: 'South Entrance', title_zh: '南口' },
					],
				},
				id: 'a',
			}),
			makeEntry({
				data: {
					geometry: [
						{ coordinates, title: 'North Entrance' },
						{ coordinates, title: 'South Entrance' },
					],
				},
				id: 'b',
			}),
			makeEntry({ data: { geometry: { coordinates } }, id: 'c' }),
		];

		expect(validateLocationsPointTitles(entries)).toEqual({
			issues: [],
			status: 'pass',
			summary: 'No duplicate Point titles (checked 2 locations with several Points)',
		});
	});

	test('flags a repeat in any title language, ignoring case and surrounding space', () => {
		const entries = [
			makeEntry({
				data: {
					geometry: [
						{ coordinates, title: 'Hangar No. 1', title_zh: '機堡' },
						{ coordinates, title: 'hangar no. 1 ', title_zh: '機堡' },
						{ coordinates, title: 'Hangar No. 2', title_th: 'โรง' },
						{ coordinates, title: 'Hangar No. 3', title_th: 'โรง' },
					],
				},
				id: 'airfield',
			}),
		];

		expect(validateLocationsPointTitles(entries)).toEqual({
			issues: [
				{ message: 'airfield: duplicate Point title "hangar no. 1 "' },
				{ message: 'airfield: duplicate Point title_zh "機堡"' },
				{ message: 'airfield: duplicate Point title_th "โรง"' },
			],
			status: 'fail',
			summary: 'Found 3 duplicate Point title(s)',
		});
	});
});
