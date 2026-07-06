import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { checkLocationsCoordinates } from './locations-coordinates';
import { makeEntry, makeRegionRefs, noop } from './validate-test-utils';

// Real Taipei boundary copied from public/divisions
const divisionsPath = path.join(import.meta.dirname, 'fixtures');

const TAIPEI_COORDINATES: [number, number] = [121.5654, 25.033];
const TAINAN_COORDINATES: [number, number] = [120.2027, 22.9917];

function makeLocation(id: string, regionIds: Array<string>, coordinates: [number, number]) {
	return makeEntry({
		id,
		data: { regions: makeRegionRefs(regionIds), geometry: { coordinates } },
	});
}

describe('checkLocationsCoordinates', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(noop);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('passes a point inside its assigned region', async () => {
		const entries = [makeLocation('inside', ['taipei'], TAIPEI_COORDINATES)];

		await expect(checkLocationsCoordinates(entries, divisionsPath)).resolves.toBe(true);
	});

	test('fails a point outside its assigned region', async () => {
		const entries = [makeLocation('outside', ['taipei'], TAINAN_COORDINATES)];

		await expect(checkLocationsCoordinates(entries, divisionsPath)).resolves.toBe(false);
	});

	test('checks every geometry when an array is provided', async () => {
		const entries = [
			makeEntry({
				id: 'multi-point',
				data: {
					regions: makeRegionRefs(['taipei']),
					geometry: [{ coordinates: TAIPEI_COORDINATES }, { coordinates: TAINAN_COORDINATES }],
				},
			}),
		];

		await expect(checkLocationsCoordinates(entries, divisionsPath)).resolves.toBe(false);
	});

	test('skips entries flagged with skipCoordinateCheck and fails when nothing was checked', async () => {
		const entries = [
			makeEntry({
				id: 'skipped',
				data: {
					skipCoordinateCheck: true,
					regions: makeRegionRefs(['taipei']),
					geometry: { coordinates: TAINAN_COORDINATES },
				},
			}),
		];

		// Pinned: zero checked locations counts as failure
		await expect(checkLocationsCoordinates(entries, divisionsPath)).resolves.toBe(false);
	});

	test('fails when the only region has no division file', async () => {
		const entries = [makeLocation('unmapped', ['atlantis'], TAIPEI_COORDINATES)];

		await expect(checkLocationsCoordinates(entries, divisionsPath)).resolves.toBe(false);
	});

	test('passes when a missing division file is skipped alongside a valid entry', async () => {
		const entries = [
			makeLocation('unmapped', ['atlantis'], TAIPEI_COORDINATES),
			makeLocation('inside', ['taipei'], TAIPEI_COORDINATES),
		];

		await expect(checkLocationsCoordinates(entries, divisionsPath)).resolves.toBe(true);
	});
});
