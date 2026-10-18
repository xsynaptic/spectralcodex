import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import type { MapPopupItem, MapSourceItem } from '#codec.ts';

import { createFieldCodec, plain } from '#codec-fields.ts';
import { MapPopupItemSchema, mapPopupKeys, MapSourceItemSchema, mapSourceKeys } from '#codec.ts';
import { LocationCategoryNumericMapping, LocationStatusNumericMapping } from '#map-codes.ts';

function byCodePoint(first: string, second: string): number {
	return first.localeCompare(second);
}

describe('MapSourceItemSchema decode', () => {
	test('decompresses keys, inverts numeric enum codes, applies hasImage and entryQuality defaults', () => {
		const result = MapSourceItemSchema.parse({
			[mapSourceKeys.category]: LocationCategoryNumericMapping[LocationCategoryEnum.Temple],
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
				category: LocationCategoryEnum.Temple,
				entryQuality: 1,
				hasImage: false,
				id: 'location-1',
				objective: 2,
				precision: 3,
				rating: 5,
				status: LocationStatusEnum.Abandoned,
				title: 'Location',
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
				category: LocationCategoryEnum.Temple,
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
				mapSourceKeys.category,
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
				category: LocationCategoryEnum.Temple,
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
				url: '/a',
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

describe('createFieldCodec', () => {
	test('a key used twice throws rather than letting one field overwrite the other', () => {
		expect(() =>
			createFieldCodec({ title: plain('t', z.string()), url: plain('t', z.string()) }),
		).toThrow('"url" reuses the key "t" of "title"');
	});
});
