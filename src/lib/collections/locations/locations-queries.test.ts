import type { CollectionEntry } from 'astro:content';

import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
	getLocationsCollectionMock,
	getRegionsByIdsMock,
	getMapDataDedicatedMock,
	getFeatureCollectionMock,
} = vi.hoisted(() => ({
	getLocationsCollectionMock: vi.fn(),
	getRegionsByIdsMock: vi.fn(),
	getMapDataDedicatedMock: vi.fn(),
	getFeatureCollectionMock: vi.fn(),
}));

vi.mock('#lib/collections/locations/locations-data.ts', () => ({
	getLocationsCollection: getLocationsCollectionMock,
}));
vi.mock('#lib/collections/regions/regions-data.ts', () => ({
	createRegionsByIdsFunction: () => Promise.resolve(getRegionsByIdsMock),
}));
vi.mock('#lib/map/map-data.ts', () => ({ getMapDataDedicated: getMapDataDedicatedMock }));
vi.mock('#lib/map/map-locations.ts', () => ({
	getLocationsFeatureCollection: getFeatureCollectionMock,
}));

const { getObjectiveLocations, getObjectiveMapData, getTheaterLocations } =
	await import('#lib/collections/locations/locations-queries.ts');

function makeLocation(
	id: string,
	data: Record<string, unknown> = {},
): CollectionEntry<'locations'> {
	return {
		id,
		collection: 'locations',
		data: {
			title: id,
			precision: 4,
			status: LocationStatusEnum.Active,
			regions: [{ id: 'taipei' }],
			geometry: { type: 'Point', coordinates: [121, 25] },
			...data,
		},
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
		regionIds.map((id) => ({ id, data: { _ancestors: id === 'taipei' ? ['taiwan'] : undefined } })),
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

describe('getObjectiveMapData', () => {
	test('the dedicated endpoint keeps sensitive points and filters by objective', async () => {
		setLocations([makeLocation('rated', { objective: 3 })]);
		getFeatureCollectionMock.mockReturnValue({ type: 'FeatureCollection', features: [] });

		await getObjectiveMapData();

		expect(getFeatureCollectionMock).toHaveBeenCalledWith(expect.anything(), {
			hideSensitiveLocations: false,
		});
		expect(getMapDataDedicatedMock).toHaveBeenCalledWith(
			expect.objectContaining({ mapId: 'objectives', isObjectiveFilterEnabled: true }),
		);
	});
});

describe('getTheaterLocations', () => {
	test('every bucket is scoped to the theaters theme', async () => {
		setLocations([
			makeLocation('theater', { themes: [theaters], precision: 1 }),
			makeLocation('other', { themes: [{ id: 'temples' }], precision: 1 }),
			makeLocation('untagged', { precision: 1 }),
		]);

		const data = await getTheaterLocations();

		expect(ids(data.theaterLocationsLowPrecision)).toStrictEqual(['theater']);
	});

	test('precision buckets are exclusive, and unknown status only applies to placed locations', async () => {
		setLocations([
			makeLocation('rough', { themes: [theaters], precision: 2 }),
			makeLocation('placed-unknown', {
				themes: [theaters],
				precision: 3,
				status: LocationStatusEnum.Unknown,
			}),
			makeLocation('vague-unknown', {
				themes: [theaters],
				precision: 2,
				status: LocationStatusEnum.Unknown,
			}),
		]);

		const data = await getTheaterLocations();

		expect(ids(data.theaterLocationsRoughPrecision)).toStrictEqual(['rough', 'vague-unknown']);
		expect(ids(data.theaterLocationsUnknownStatus)).toStrictEqual(['placed-unknown']);
	});

	test('the colonial-era list drops what no longer stands or cannot be found', async () => {
		setLocations([
			makeLocation('extant', { themes: [theaters, colonial] }),
			makeLocation('vanished', {
				themes: [theaters, colonial],
				status: LocationStatusEnum.Vanished,
			}),
			makeLocation('unknown', { themes: [theaters, colonial], status: LocationStatusEnum.Unknown }),
			makeLocation('post-war', { themes: [theaters] }),
		]);

		const data = await getTheaterLocations();

		expect(ids(data.theaterLocationsJapanese)).toStrictEqual(['extant']);
	});

	test('objective lists split at four, and an objective of one falls in neither', async () => {
		setLocations([
			makeLocation('top', { themes: [theaters], objective: 4 }),
			makeLocation('middle', { themes: [theaters], objective: 3 }),
			makeLocation('lowest', { themes: [theaters], objective: 1 }),
			makeLocation('none', { themes: [theaters] }),
		]);

		const data = await getTheaterLocations();

		expect(ids(data.theaterLocationsObjectivesTop)).toStrictEqual(['top']);
		expect(ids(data.theaterLocationsObjectivesAll)).toStrictEqual(['middle']);
	});

	test('each bucket runs north to south, taking a multi-point location at its northernmost', async () => {
		setLocations([
			makeLocation('south', { themes: [theaters], precision: 1 }),
			makeLocation('north', {
				themes: [theaters],
				precision: 1,
				geometry: [
					{ type: 'Point', coordinates: [121, 24] },
					{ type: 'Point', coordinates: [121, 26] },
				],
			}),
		]);

		const data = await getTheaterLocations();

		expect(ids(data.theaterLocationsLowPrecision)).toStrictEqual(['north', 'south']);
	});
});
