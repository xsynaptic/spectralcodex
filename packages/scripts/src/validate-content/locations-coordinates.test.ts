import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { validateLocationsCoordinates } from './locations-coordinates';
import { makeEntry, makeRegionRefs } from './validate-test-utils';

// Real Taipei boundary copied from public/divisions
const divisionsPath = path.join(import.meta.dirname, 'fixtures');

const taipeiCoordinates: [number, number] = [121.5654, 25.033];
const tainanCoordinates: [number, number] = [120.2027, 22.9917];

function makeLocation(id: string, regionIds: Array<string>, coordinates: [number, number]) {
	return makeEntry({
		id,
		data: { regions: makeRegionRefs(regionIds), geometry: { coordinates } },
	});
}

describe('validateLocationsCoordinates', () => {
	test('passes a point inside its assigned region', async () => {
		const entries = [makeLocation('inside', ['taipei'], taipeiCoordinates)];

		await expect(validateLocationsCoordinates(entries, divisionsPath)).resolves.toMatchObject({
			status: 'pass',
		});
	});

	test('fails a point outside its assigned region', async () => {
		const entries = [makeLocation('outside', ['taipei'], tainanCoordinates)];

		await expect(validateLocationsCoordinates(entries, divisionsPath)).resolves.toMatchObject({
			status: 'fail',
		});
	});

	test('checks every geometry when an array is provided', async () => {
		const entries = [
			makeEntry({
				id: 'multi-point',
				data: {
					regions: makeRegionRefs(['taipei']),
					geometry: [{ coordinates: taipeiCoordinates }, { coordinates: tainanCoordinates }],
				},
			}),
		];

		await expect(validateLocationsCoordinates(entries, divisionsPath)).resolves.toMatchObject({
			status: 'fail',
		});
	});

	test('skips entries flagged with skipCoordinateCheck and fails when nothing was checked', async () => {
		const entries = [
			makeEntry({
				id: 'skipped',
				data: {
					skipCoordinateCheck: true,
					regions: makeRegionRefs(['taipei']),
					geometry: { coordinates: tainanCoordinates },
				},
			}),
		];

		// Pinned: zero checked locations counts as failure
		await expect(validateLocationsCoordinates(entries, divisionsPath)).resolves.toMatchObject({
			status: 'fail',
		});
	});

	test('fails when the only region has no division file', async () => {
		const entries = [makeLocation('unmapped', ['atlantis'], taipeiCoordinates)];

		await expect(validateLocationsCoordinates(entries, divisionsPath)).resolves.toMatchObject({
			status: 'fail',
		});
	});

	test('passes when a missing division file is skipped alongside a valid entry', async () => {
		const entries = [
			makeLocation('unmapped', ['atlantis'], taipeiCoordinates),
			makeLocation('inside', ['taipei'], taipeiCoordinates),
		];

		await expect(validateLocationsCoordinates(entries, divisionsPath)).resolves.toMatchObject({
			status: 'pass',
		});
	});
});
