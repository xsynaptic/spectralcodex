import type { CollectionEntry } from 'astro:content';

import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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

function makeLocation(
	id: string,
	data: Record<string, unknown> = {},
): CollectionEntry<'locations'> {
	return {
		collection: 'locations',
		data: {
			geometry: { coordinates: [121, 25], type: 'Point' },
			precision: 4,
			regions: [{ id: 'taipei' }],
			status: LocationStatusEnum.Active,
			title: id,
			...data,
		},
		id,
	} as unknown as CollectionEntry<'locations'>;
}

function setLocations(entries: Array<CollectionEntry<'locations'>>) {
	getLocationsCollectionMock.mockResolvedValue({ entries });
}

const ids = (entries: Array<CollectionEntry<'locations'>>) => entries.map((entry) => entry.id);

const theaters = { id: 'taiwan-theaters' };
const colonial = { id: 'taiwan-japanese-colonial-era' };

beforeEach(() => {
	getRegionsByIdsMock.mockImplementation((regionIds: Array<string>) =>
		regionIds.map((id) => ({ data: { _ancestors: id === 'taipei' ? ['taiwan'] : undefined }, id })),
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

	test('a descendant region qualifies as readily as Taiwan itself', async () => {
		setLocations([
			makeLocation('in-descendant', { objective: 3, regions: [{ id: 'taipei' }] }),
			makeLocation('in-taiwan', { objective: 3, regions: [{ id: 'taiwan' }] }),
			makeLocation('elsewhere', { objective: 3, regions: [{ id: 'japan' }] }),
		]);

		expect(ids(await getObjectiveLocations())).toStrictEqual(['in-descendant', 'in-taiwan']);
	});

	test('one qualifying region is enough for a location spanning several', async () => {
		setLocations([
			makeLocation('straddles', { objective: 2, regions: [{ id: 'japan' }, { id: 'taiwan' }] }),
		]);

		expect(ids(await getObjectiveLocations())).toStrictEqual(['straddles']);
	});

	test('a location with no regions at all is left out', async () => {
		setLocations([makeLocation('unplaced', { objective: 5, regions: [] })]);

		expect(await getObjectiveLocations()).toStrictEqual([]);
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
