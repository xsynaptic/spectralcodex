import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import {
	getLocationDetails,
	getLocationPoints,
} from '#lib/collections/locations/locations-geometry.ts';

function makeLocation(data: Record<string, unknown>): ComputedEntry<'locations'> {
	return {
		collection: 'locations',
		data: {
			precision: 4,
			status: LocationStatusEnum.Idle,
			title: 'Saltworks',
			...data,
		},
		id: 'saltworks',
	} as unknown as ComputedEntry<'locations'>;
}

function makePoint(longitude: number, latitude: number, extra: Record<string, unknown> = {}) {
	return { coordinates: [longitude, latitude], ...extra };
}

describe('getLocationPoints', () => {
	test('returns no rows for a single Point, in either authored shape', () => {
		expect(getLocationPoints(makeLocation({ geometry: makePoint(120.1, 23.3) }))).toBeUndefined();
		expect(getLocationPoints(makeLocation({ geometry: [makePoint(120.1, 23.3)] }))).toBeUndefined();
	});

	test('keeps the authored order', () => {
		const rows = getLocationPoints(
			makeLocation({
				geometry: [
					makePoint(120.2, 23.4, { title: 'South' }),
					makePoint(120.1, 23.3, { title: 'North' }),
				],
			}),
		);

		expect(rows?.map((row) => row.title)).toEqual(['South', 'North']);
	});

	test('gives every Point a Status, falling back to the Location', () => {
		const rows = getLocationPoints(
			makeLocation({
				geometry: [
					makePoint(120.1, 23.3, { status: LocationStatusEnum.Remnants }),
					makePoint(120.2, 23.4, { status: LocationStatusEnum.Idle }),
					makePoint(120.3, 23.5),
				],
			}),
		);

		expect(rows?.map((row) => row.status)).toEqual([
			LocationStatusEnum.Remnants,
			LocationStatusEnum.Idle,
			LocationStatusEnum.Idle,
		]);
	});

	test('builds no Google Maps link for a Point that authors none', () => {
		const rows = getLocationPoints(
			makeLocation({
				geometry: [
					makePoint(120.1, 23.3, { googleMapsUrl: 'https://maps.app.goo.gl/abc' }),
					makePoint(120.2, 23.4),
				],
			}),
		);

		expect(rows?.map((row) => row.googleMapsUrl)).toEqual([
			'https://maps.app.goo.gl/abc',
			undefined,
		]);
	});

	test("names a Point's Heritage only where it differs from the Location's", () => {
		const rows = getLocationPoints(
			makeLocation({
				geometry: [
					makePoint(120.1, 23.3, { heritage: 'historic-building' }),
					makePoint(120.2, 23.4, { heritage: 'cultural-landscape' }),
					makePoint(120.3, 23.5),
				],
				heritage: 'cultural-landscape',
			}),
		);

		expect(rows?.map((row) => row.heritage)).toEqual(['historic-building', undefined, undefined]);
	});

	test('carries only what the Point itself authors', () => {
		const rows = getLocationPoints(
			makeLocation({
				_wikipediaUrl: 'https://en.wikipedia.org/wiki/Saltworks',
				description: 'The whole works.',
				geometry: [
					makePoint(120.1, 23.3, {
						description: 'Salt _storage_ here.',
						title: 'Storage',
						title_zh: '鹽倉',
						wikipediaUrl: 'https://en.wikipedia.org/wiki/Storage',
					}),
					makePoint(120.2, 23.4, { title: 'Office' }),
				],
			}),
		);

		expect(rows).toMatchObject([
			{
				descriptionHtml: '<p>Salt <em>storage</em> here.</p>',
				titleMultilingual: { lang: 'zh', value: '鹽倉' },
				wikipediaUrl: 'https://en.wikipedia.org/wiki/Storage',
			},
			{
				descriptionHtml: undefined,
				titleMultilingual: undefined,
				wikipediaUrl: undefined,
			},
		]);
	});
});

describe('getLocationDetails', () => {
	test('gives a single Point its coordinates', () => {
		expect(
			getLocationDetails(makeLocation({ geometry: makePoint(120.158968, 23.366957) })),
		).toEqual({
			coordinates: '23.366957, 120.158968',
			heritage: [],
			status: LocationStatusEnum.Idle,
		});
	});

	test('writes latitude first, padded to six decimals', () => {
		expect(
			getLocationDetails(makeLocation({ geometry: makePoint(-120.1, 23.5) })).coordinates,
		).toBe('23.500000, -120.100000');
	});

	test('leaves the positional rows to the Points when there are several', () => {
		const details = getLocationDetails(
			makeLocation({
				geometry: [
					makePoint(120.1, 23.3, { heritage: 'historic-building' }),
					makePoint(120.2, 23.4),
				],
				heritage: 'cultural-landscape',
			}),
		);

		expect(details).toEqual({
			coordinates: undefined,
			heritage: ['cultural-landscape', 'historic-building'],
			status: LocationStatusEnum.Idle,
		});
	});
});
