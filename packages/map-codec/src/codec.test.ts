import { GeometryTypeEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import type { MapPopupItem, MapSourceItem } from '#codec.ts';

import { createFieldCodec, plain } from '#codec-fields.ts';
import {
	encodeMapDirectory,
	MapDirectorySchema,
	MapPopupItemSchema,
	mapPopupKeys,
	MapSourceItemSchema,
	mapSourceKeys,
} from '#codec.ts';
import { LocationStatusNumericMapping } from '#map-codes.ts';
import { getMapRowUrl } from '#map-ids.ts';

function byCodePoint(first: string, second: string): number {
	return first.localeCompare(second);
}

describe('MapSourceItemSchema decode', () => {
	test('decompresses keys, inverts numeric enum codes, applies hasImage and entryQuality defaults', () => {
		const result = MapSourceItemSchema.parse({
			[mapSourceKeys.geometry]: [100, 13],
			[mapSourceKeys.id]: 'location-1',
			[mapSourceKeys.objective]: 2,
			[mapSourceKeys.precision]: 3,
			[mapSourceKeys.rating]: 5,
			[mapSourceKeys.status]: LocationStatusNumericMapping[LocationStatusEnum.Abandoned],
			[mapSourceKeys.title]: 'Location',
		});

		expect(result).toEqual({
			geometry: {
				coordinates: [100, 13],
				type: GeometryTypeEnum.Point,
			},
			properties: {
				entryQuality: 1,
				hasImage: false,
				id: 'location-1',
				objective: 2,
				precision: 3,
				rating: 5,
				status: LocationStatusEnum.Abandoned,
				title: 'Location',
				url: '/location-1/',
			},
			type: 'Feature',
		});
	});

	test('a geometry that is not one position is rejected', () => {
		const row = {
			[mapSourceKeys.id]: 'location-1',
			[mapSourceKeys.precision]: 3,
			[mapSourceKeys.rating]: 5,
			[mapSourceKeys.title]: 'Location',
		};

		expect(
			MapSourceItemSchema.safeParse({
				...row,
				[mapSourceKeys.geometry]: [
					[100, 13],
					[101, 14],
				],
			}).success,
		).toBe(false);
		expect(
			MapSourceItemSchema.safeParse({ ...row, [mapSourceKeys.geometry]: { j: 0, x: [100, 13] } })
				.success,
		).toBe(false);
	});
});

describe('MapPopupItemSchema decode', () => {
	test('assembles the image object when srcSet is present', () => {
		const result = MapPopupItemSchema.parse({
			[mapPopupKeys.id]: 'location-1',
			[mapPopupKeys.image]: '/image.jpg 1x',
			[mapPopupKeys.title]: 'Location',
		});

		expect(result.image).toEqual({ srcSet: '/image.jpg 1x' });
	});

	test('leaves image undefined when srcSet is absent', () => {
		const result = MapPopupItemSchema.parse({
			[mapPopupKeys.id]: 'location-1',
			[mapPopupKeys.title]: 'Location',
		});

		expect(result.image).toBeUndefined();
	});
});

describe('MapSourceItemSchema encode (byte-faithful compressed form)', () => {
	test('omits absent optionals; never emits hasImage:false or entryQuality:1', () => {
		const standard: MapSourceItem = {
			geometry: { coordinates: [0, 0], type: GeometryTypeEnum.Point },
			properties: {
				entryQuality: 1,
				hasImage: false,
				id: 'b',
				precision: 1,
				rating: 1,
				status: LocationStatusEnum.Abandoned,
				title: 'B',
			},
			type: 'Feature',
		};

		const compressed = z.encode(MapSourceItemSchema, standard);
		const keys = Object.keys(compressed).toSorted(byCodePoint);

		expect(keys).toEqual(
			[
				mapSourceKeys.id,
				mapSourceKeys.title,
				mapSourceKeys.status,
				mapSourceKeys.precision,
				mapSourceKeys.rating,
				mapSourceKeys.geometry,
			].toSorted(byCodePoint),
		);
	});
});

describe('round trips', () => {
	test('decode(encode(standard)) deep-equals standard for a fully populated source item', () => {
		const standard: MapSourceItem = {
			geometry: { coordinates: [100, 13], type: GeometryTypeEnum.Point },
			properties: {
				chunkKey: '7',
				entryQuality: 4,
				hasImage: true,
				id: 'a',
				objective: 2,
				outlier: true,
				pointTitle: 'Point (點)',
				precision: 3,
				rating: 5,
				regionOrdinals: [1, 2],
				status: LocationStatusEnum.Abandoned,
				themeIndices: [3],
				title: 'A',
				url: '/a/',
			},
			type: 'Feature',
		};

		expect(MapSourceItemSchema.parse(z.encode(MapSourceItemSchema, standard))).toEqual(standard);
	});

	test('decode(encode(standard)) deep-equals standard for a popup item with image', () => {
		const standard: MapPopupItem = {
			description: 'desc',
			googleMapsUrl: 'https://maps.app.goo.gl/abc',
			id: 'a',
			image: { srcSet: '/a.jpg 1x' },
			own: 5,
			title: 'A',
			titleMultilingualLang: 'zh',
			titleMultilingualValue: '寺',
			wikipediaUrl: 'https://en.wikipedia.org/wiki/A',
		};

		expect(MapPopupItemSchema.parse(z.encode(MapPopupItemSchema, standard))).toEqual(standard);
	});

	test('links ride without their scheme, and a Google Maps short link without its host', () => {
		const encoded = z.encode(MapPopupItemSchema, {
			googleMapsUrl: 'https://maps.app.goo.gl/abc',
			id: 'a',
			title: 'A',
			wikipediaUrl: 'https://en.wikipedia.org/wiki/A',
		});

		expect(encoded[mapPopupKeys.googleMapsUrl]).toBe('abc');
		expect(encoded[mapPopupKeys.wikipediaUrl]).toBe('en.wikipedia.org/wiki/A');
		expect(
			z.encode(MapPopupItemSchema, {
				googleMapsUrl: 'https://www.google.com/maps/place/x',
				id: 'b',
				title: 'B',
			})[mapPopupKeys.googleMapsUrl],
		).toBe('www.google.com/maps/place/x');
	});
});

function sourceItemOf(id: string, title: string): MapSourceItem {
	return {
		geometry: { coordinates: [100, 13], type: GeometryTypeEnum.Point },
		properties: {
			entryQuality: 1,
			hasImage: false,
			id,
			precision: 3,
			rating: 2,
			status: LocationStatusEnum.Unknown,
			title,
			url: getMapRowUrl(id),
		},
		type: 'Feature',
	};
}

describe('MapSourceItemSchema id residual', () => {
	test.each([
		{ form: 'exact', id: 'dagangshan-airfield', stored: '', title: 'Dagangshan Airfield' },
		{
			form: 'prefix',
			id: 'alian-dagangshan-airfield',
			stored: 'alian-',
			title: 'Dagangshan Airfield',
		},
		{ form: 'full', id: 'longquan-temple', stored: 'longquan-temple', title: 'Lungchuan Temple' },
		{ form: 'folded', id: 'cafe-and-bars', stored: '', title: 'Cafe & Bar’s' },
		{ form: 'non-ASCII letter', id: 'cafe-bar', stored: 'cafe-bar', title: 'Café Bar' },
		{
			form: 'multi-Point prefix',
			id: 'baozhong-longyan-sugar-factory:0',
			stored: 'baozhong-:0',
			title: 'Longyan Sugar Factory: Entrance Pillars',
		},
		{ form: 'multi-Point exact', id: 'old-street:12', stored: ':12', title: 'Old Street: Gate' },
		{ form: 'single-Point colon', id: 'fort-north', stored: '', title: 'Fort: North' },
		{ form: 'multi-Point colon', id: 'fort-north:0', stored: 'fort-north:0', title: 'Fort: North' },
		{ form: 'empty slug', id: 'dagangshan', stored: 'dagangshan', title: '大崗山' },
	])('$form: $id encodes as "$stored" and decodes back', ({ id, stored, title }) => {
		const standard = sourceItemOf(id, title);
		const compressed = z.encode(MapSourceItemSchema, standard);

		expect(compressed[mapSourceKeys.id]).toBe(stored);
		expect(MapSourceItemSchema.parse(compressed)).toEqual(standard);
	});

	test('an id that would read as a residual throws rather than decoding to another id', () => {
		expect(() => z.encode(MapSourceItemSchema, sourceItemOf('trailing-', 'Other'))).toThrow(
			'"trailing-"',
		);
		expect(() => z.encode(MapSourceItemSchema, sourceItemOf('', 'Other'))).toThrow('""');
	});

	test('the url derives from the entry id, without the Point suffix', () => {
		const decoded = MapSourceItemSchema.parse(
			z.encode(
				MapSourceItemSchema,
				sourceItemOf('baozhong-longyan-sugar-factory:3', 'Longyan Sugar Factory: Gate'),
			),
		);

		expect(decoded.properties.url).toBe('/baozhong-longyan-sugar-factory/');
	});
});

describe('MapDirectorySchema', () => {
	test('one column per encoded key, nulls where a row omits it, all-null columns dropped', () => {
		const first = sourceItemOf('alpha', 'Alpha');
		const second = sourceItemOf('beta-gamma', 'Gamma');

		second.properties.chunkKey = '3';

		const columns = encodeMapDirectory([first, second]);

		expect(columns[mapSourceKeys.id]).toEqual(['', 'beta-']);
		expect(columns[mapSourceKeys.chunkKey]).toEqual([undefined, '3']);
		expect(columns[mapSourceKeys.geometry]).toEqual([
			[100, 13],
			[100, 13],
		]);
		expect(Object.hasOwn(columns, mapSourceKeys.objective)).toBe(false);

		const json = JSON.stringify(columns);

		expect(json).toContain(`"${mapSourceKeys.chunkKey}":[null,"3"]`);
		expect(MapDirectorySchema.parse(JSON.parse(json))).toEqual([first, second]);
	});

	test('columns of different lengths are rejected', () => {
		const columns = encodeMapDirectory([
			sourceItemOf('alpha', 'Alpha'),
			sourceItemOf('beta', 'Beta'),
		]);

		expect(
			MapDirectorySchema.safeParse({ ...columns, [mapSourceKeys.title]: ['Alpha'] }).success,
		).toBe(false);
	});

	test('an unknown column is rejected', () => {
		const columns = encodeMapDirectory([sourceItemOf('alpha', 'Alpha')]);

		expect(MapDirectorySchema.safeParse({ ...columns, u: ['/alpha/'] }).success).toBe(false);
	});
});

describe('createFieldCodec', () => {
	test('a key used twice throws rather than letting one field overwrite the other', () => {
		expect(() =>
			createFieldCodec({ title: plain('t', z.string()), url: plain('t', z.string()) }),
		).toThrow('"url" reuses the key "t" of "title"');
	});
});
