import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { validateLocationsCoordinates } from '#validate-content/locations-coordinates.ts';
import { makeEntry, makeRegionRefs } from '#validate-content/validate-test-utils.ts';

const divisionsPath = path.join(import.meta.dirname, 'fixtures');

const regionEntries = [
	makeEntry({
		collection: 'regions',
		data: { divisionId: 'ed2e460a-8832-472f-a8fe-54be8c2c6d16' },
		id: 'taipei',
	}),
	makeEntry({ collection: 'regions', data: { divisionId: 'uncached-division' }, id: 'atlantis' }),
];

const taipeiCoordinates: [number, number] = [121.5654, 25.033];
const tainanCoordinates: [number, number] = [120.2027, 22.9917];

const unloadableNote = (regionId: string) =>
	`${regionId}: could not load Division geometry, skipping all other locations in this region`;

function makeLocation(id: string, regionIds: Array<string>, coordinates: [number, number]) {
	return makeEntry({
		data: { geometry: { coordinates }, regions: makeRegionRefs(regionIds) },
		id,
	});
}

describe('validateLocationsCoordinates', () => {
	test('passes a point inside its assigned region', async () => {
		const entries = [makeLocation('inside', ['taipei'], taipeiCoordinates)];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [],
			notes: [],
			status: 'pass',
			summary: '1 valid location coordinates (0 skipped)',
		});
	});

	test('fails a point outside its assigned region, naming the entry and the region', async () => {
		const entries = [makeLocation('outside', ['taipei'], tainanCoordinates)];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [{ message: 'outside: [120.2027, 22.9917] not in region(s): taipei' }],
			notes: [],
			status: 'fail',
			summary: 'Found 1 coordinate mismatch(es)',
		});
	});

	test('checks every geometry when an array is provided, reporting only the stray one', async () => {
		const entries = [
			makeEntry({
				data: {
					geometry: [{ coordinates: taipeiCoordinates }, { coordinates: tainanCoordinates }],
					regions: makeRegionRefs(['taipei']),
				},
				id: 'multi-point',
			}),
		];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [{ message: 'multi-point: [120.2027, 22.9917] not in region(s): taipei' }],
			notes: [],
			status: 'fail',
			summary: 'Found 1 coordinate mismatch(es)',
		});
	});

	test('a lone entry flagged with skipCoordinateCheck leaves nothing to check', async () => {
		const entries = [
			makeEntry({
				data: {
					geometry: { coordinates: tainanCoordinates },
					regions: makeRegionRefs(['taipei']),
					skipCoordinateCheck: true,
				},
				id: 'skipped',
			}),
		];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [],
			notes: [],
			status: 'fail',
			summary: 'No locations could be checked',
		});
	});

	test('a skipped entry that would otherwise fail does not sink a valid neighbour', async () => {
		const entries = [
			makeEntry({
				data: {
					geometry: { coordinates: tainanCoordinates },
					regions: makeRegionRefs(['taipei']),
					skipCoordinateCheck: true,
				},
				id: 'skipped',
			}),
			makeLocation('inside', ['taipei'], taipeiCoordinates),
		];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [],
			notes: [],
			status: 'pass',
			summary: '1 valid location coordinates (0 skipped)',
		});
	});

	test('an entry with no usable geometry is passed over, not crashed on', async () => {
		const entries = [
			makeEntry({ data: { regions: makeRegionRefs(['taipei']) }, id: 'no-geometry' }),
			makeLocation('inside', ['taipei'], taipeiCoordinates),
		];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [],
			notes: [],
			status: 'pass',
			summary: '1 valid location coordinates (0 skipped)',
		});
	});
});

describe('validateLocationsCoordinates region coverage', () => {
	test('fails when the only region has no cached Division, and says which', async () => {
		const entries = [makeLocation('unmapped', ['atlantis'], taipeiCoordinates)];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [],
			notes: [unloadableNote('atlantis')],
			status: 'fail',
			summary: 'No locations could be checked',
		});
	});

	test('fails when the only region names no Division, and says which', async () => {
		const entries = [makeLocation('unmapped', ['zeta-land'], taipeiCoordinates)];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [],
			notes: [unloadableNote('zeta-land')],
			status: 'fail',
			summary: 'No locations could be checked',
		});
	});

	test('a second loadable region keeps the unloadable note quiet', async () => {
		const entries = [makeLocation('two-regions', ['atlantis', 'taipei'], taipeiCoordinates)];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [],
			notes: [],
			status: 'pass',
			summary: '1 valid location coordinates (0 skipped)',
		});
	});

	test('the pass summary counts checked entries and entries skipped for want of Division geometry', async () => {
		const entries = [
			makeLocation('unmapped', ['atlantis'], taipeiCoordinates),
			makeLocation('inside', ['taipei'], taipeiCoordinates),
		];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [],
			notes: [unloadableNote('atlantis')],
			status: 'pass',
			summary: '1 valid location coordinates (1 skipped)',
		});
	});

	test('a failing run lists every Region missing Division geometry, sorted', async () => {
		const entries = [
			makeLocation('multi-region', ['zeta-land', 'atlantis', 'taipei'], tainanCoordinates),
		];

		await expect(
			validateLocationsCoordinates(entries, regionEntries, divisionsPath),
		).resolves.toStrictEqual({
			issues: [{ message: 'multi-region: [120.2027, 22.9917] not in region(s): taipei' }],
			notes: ['Regions missing Division geometry: atlantis, zeta-land'],
			status: 'fail',
			summary: 'Found 1 coordinate mismatch(es)',
		});
	});
});
