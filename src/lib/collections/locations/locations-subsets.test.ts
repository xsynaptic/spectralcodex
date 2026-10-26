import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import { makeEntry, makePoint } from '#lib/collections/collections-test-utils.ts';

const { getLocationsCollectionMock, getRegionsByIdsMock } = vi.hoisted(() => ({
	getLocationsCollectionMock: vi.fn(),
	getRegionsByIdsMock: vi.fn(),
}));

vi.mock('#lib/collections/locations/locations-data.ts', () => ({
	getLocationsCollection: getLocationsCollectionMock,
}));
vi.mock('#lib/collections/regions/regions-data.ts', () => ({
	createRegionsByIdsFunction: () => Promise.resolve(getRegionsByIdsMock),
}));

const { getObjectiveLocations, getTheaterLocations } =
	await import('#lib/collections/locations/locations-subsets.ts');

function makeLocation(id: string, data: Record<string, unknown> = {}) {
	return makeEntry('locations', id, {
		geometry: makePoint(121, 25),
		precision: 4,
		regions: [{ id: 'taipei' }],
		status: LocationStatusEnum.Active,
		...data,
	});
}

function setLocations(entries: Array<ComputedEntry<'locations'>>) {
	getLocationsCollectionMock.mockResolvedValue({ entries });
}

const ids = (entries: Array<ComputedEntry<'locations'>>) => entries.map((entry) => entry.id);

const theaters = { id: 'taiwan-theaters' };
const colonial = { id: 'taiwan-japanese-colonial-era' };

beforeEach(() => {
	getRegionsByIdsMock.mockImplementation((regionIds: Array<string>) =>
		regionIds.map((id) => ({ data: { _ancestors: id === 'taipei' ? ['taiwan'] : [] }, id })),
	);
});

describe('getObjectiveLocations', () => {
	test('an objective of zero or none is not an objective', async () => {
		setLocations([
			makeLocation('rated', { objective: 1 }),
			makeLocation('zero', { objective: 0 }),
			makeLocation('unrated'),
		]);

		expect(ids(await getObjectiveLocations())).toStrictEqual(['rated']);
	});

	test('one region in Taiwan or below it qualifies; a location with no regions is left out', async () => {
		setLocations([
			makeLocation('in-descendant', { objective: 3, regions: [{ id: 'taipei' }] }),
			makeLocation('in-taiwan', { objective: 3, regions: [{ id: 'taiwan' }] }),
			makeLocation('elsewhere', { objective: 3, regions: [{ id: 'japan' }] }),
			makeLocation('straddles', { objective: 2, regions: [{ id: 'japan' }, { id: 'taiwan' }] }),
			makeLocation('unplaced', { objective: 5, regions: [] }),
		]);

		expect(ids(await getObjectiveLocations())).toStrictEqual([
			'in-descendant',
			'in-taiwan',
			'straddles',
		]);
	});
});

describe('getTheaterLocations', () => {
	test('the list is scoped to the theaters theme', async () => {
		setLocations([
			makeLocation('theater', { themes: [theaters, colonial] }),
			makeLocation('other', { themes: [{ id: 'temples' }, colonial] }),
			makeLocation('untagged'),
		]);

		const data = await getTheaterLocations();

		expect(ids(data.theaterLocationsJapanese)).toStrictEqual(['theater']);
	});

	test('the colonial-era list drops what no longer stands or cannot be found', async () => {
		setLocations([
			makeLocation('extant', { themes: [theaters, colonial] }),
			makeLocation('vanished', {
				status: LocationStatusEnum.Vanished,
				themes: [theaters, colonial],
			}),
			makeLocation('unknown', { status: LocationStatusEnum.Unknown, themes: [theaters, colonial] }),
			makeLocation('post-war', { themes: [theaters] }),
		]);

		const data = await getTheaterLocations();

		expect(ids(data.theaterLocationsJapanese)).toStrictEqual(['extant']);
	});

	test('the list runs north to south, taking a multi-point location at its northernmost', async () => {
		setLocations([
			makeLocation('south', { themes: [theaters, colonial] }),
			makeLocation('north', {
				geometry: [
					{ coordinates: [121, 24], type: 'Point' },
					{ coordinates: [121, 26], type: 'Point' },
				],
				themes: [theaters, colonial],
			}),
		]);

		const data = await getTheaterLocations();

		expect(ids(data.theaterLocationsJapanese)).toStrictEqual(['north', 'south']);
	});
});
