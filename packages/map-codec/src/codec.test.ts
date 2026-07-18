import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationCategoryNumericMapping,
	LocationStatusEnum,
	LocationStatusNumericMapping,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import type { MapPopupItem, MapSourceItem } from './codec';

import {
	encodeMapPopupData,
	encodeMapSourceData,
	MapPopupItemSchema,
	MapSourceItemSchema,
} from './codec';
import { MapDataGeometryTypeNumericMapping, MapDataKeysCompressed } from './map-data-keys';

function byCodePoint(first: string, second: string): number {
	return first.localeCompare(second);
}

describe('MapSourceItemSchema decode', () => {
	test('decompresses keys, inverts numeric enum codes, applies hasImage default', () => {
		const result = MapSourceItemSchema.parse({
			[MapDataKeysCompressed.Id]: 'location-1',
			[MapDataKeysCompressed.Title]: 'Location',
			[MapDataKeysCompressed.Category]: LocationCategoryNumericMapping[LocationCategoryEnum.Temple],
			[MapDataKeysCompressed.Status]: LocationStatusNumericMapping[LocationStatusEnum.Abandoned],
			[MapDataKeysCompressed.Precision]: 3,
			[MapDataKeysCompressed.Quality]: 4,
			[MapDataKeysCompressed.Rating]: 5,
			[MapDataKeysCompressed.Objective]: 2,
			[MapDataKeysCompressed.Geometry]: {
				[MapDataKeysCompressed.GeometryType]:
					MapDataGeometryTypeNumericMapping[GeometryTypeEnum.Point],
				[MapDataKeysCompressed.GeometryCoordinates]: [100, 13],
			},
		});

		expect(result).toEqual({
			properties: {
				id: 'location-1',
				title: 'Location',
				category: LocationCategoryEnum.Temple,
				status: LocationStatusEnum.Abandoned,
				precision: 3,
				quality: 4,
				rating: 5,
				objective: 2,
				hasImage: false,
			},
			geometry: {
				type: GeometryTypeEnum.Point,
				coordinates: [100, 13],
			},
		});
	});

	test('omits objective and outlier when absent', () => {
		const result = MapSourceItemSchema.parse({
			[MapDataKeysCompressed.Id]: 'location-1',
			[MapDataKeysCompressed.Title]: 'Location',
			[MapDataKeysCompressed.Category]: LocationCategoryNumericMapping[LocationCategoryEnum.Temple],
			[MapDataKeysCompressed.Status]: LocationStatusNumericMapping[LocationStatusEnum.Abandoned],
			[MapDataKeysCompressed.Precision]: 3,
			[MapDataKeysCompressed.Quality]: 4,
			[MapDataKeysCompressed.Rating]: 5,
			[MapDataKeysCompressed.Geometry]: {
				[MapDataKeysCompressed.GeometryType]:
					MapDataGeometryTypeNumericMapping[GeometryTypeEnum.Point],
				[MapDataKeysCompressed.GeometryCoordinates]: [100, 13],
			},
		});

		expect('objective' in result.properties).toBe(false);
		expect('outlier' in result.properties).toBe(false);
	});
});

describe('MapPopupItemSchema decode', () => {
	test('assembles the image object when srcSet is present', () => {
		const result = MapPopupItemSchema.parse({
			[MapDataKeysCompressed.Id]: 'location-1',
			[MapDataKeysCompressed.Title]: 'Location',
			[MapDataKeysCompressed.Url]: '/location-1',
			[MapDataKeysCompressed.ImageSrcSet]: '/image.jpg 1x',
		});

		expect(result.url).toBe('/location-1');
		expect(result.image).toEqual({ srcSet: '/image.jpg 1x' });
	});

	test('leaves image undefined when srcSet is absent', () => {
		const result = MapPopupItemSchema.parse({
			[MapDataKeysCompressed.Id]: 'location-1',
			[MapDataKeysCompressed.Title]: 'Location',
		});

		expect(result.image).toBeUndefined();
	});
});

describe('MapSourceItemSchema encode (byte-faithful compressed form)', () => {
	const standardFull: MapSourceItem = {
		properties: {
			id: 'a',
			title: 'A',
			category: LocationCategoryEnum.Temple,
			status: LocationStatusEnum.Abandoned,
			precision: 3,
			quality: 4,
			rating: 5,
			objective: 2,
			outlier: false,
			hasImage: true,
			regionOrdinals: [1, 2],
			themeIndices: [3],
			chunkKey: '0',
		},
		geometry: { type: GeometryTypeEnum.Point, coordinates: [100, 13] },
	};

	test('emits present optionals and hasImage flag', () => {
		expect(z.encode(MapSourceItemSchema, standardFull)).toEqual({
			[MapDataKeysCompressed.Id]: 'a',
			[MapDataKeysCompressed.Title]: 'A',
			[MapDataKeysCompressed.Category]: LocationCategoryNumericMapping[LocationCategoryEnum.Temple],
			[MapDataKeysCompressed.Status]: LocationStatusNumericMapping[LocationStatusEnum.Abandoned],
			[MapDataKeysCompressed.Precision]: 3,
			[MapDataKeysCompressed.Quality]: 4,
			[MapDataKeysCompressed.Rating]: 5,
			[MapDataKeysCompressed.Objective]: 2,
			[MapDataKeysCompressed.Outlier]: false,
			[MapDataKeysCompressed.HasImage]: true,
			[MapDataKeysCompressed.RegionOrdinals]: [1, 2],
			[MapDataKeysCompressed.ThemeIndices]: [3],
			[MapDataKeysCompressed.ChunkKey]: '0',
			[MapDataKeysCompressed.Geometry]: {
				[MapDataKeysCompressed.GeometryType]:
					MapDataGeometryTypeNumericMapping[GeometryTypeEnum.Point],
				[MapDataKeysCompressed.GeometryCoordinates]: [100, 13],
			},
		});
	});

	test('omits absent optionals; never emits hasImage:false', () => {
		const standard: MapSourceItem = {
			properties: {
				id: 'b',
				title: 'B',
				category: LocationCategoryEnum.Temple,
				status: LocationStatusEnum.Abandoned,
				precision: 1,
				quality: 1,
				rating: 1,
				hasImage: false,
			},
			geometry: { type: GeometryTypeEnum.Point, coordinates: [0, 0] },
		};

		const compressed = z.encode(MapSourceItemSchema, standard);
		const keys = Object.keys(compressed).sort(byCodePoint);

		expect(keys).toEqual(
			[
				MapDataKeysCompressed.Id,
				MapDataKeysCompressed.Title,
				MapDataKeysCompressed.Category,
				MapDataKeysCompressed.Status,
				MapDataKeysCompressed.Precision,
				MapDataKeysCompressed.Quality,
				MapDataKeysCompressed.Rating,
				MapDataKeysCompressed.Geometry,
			].sort(byCodePoint),
		);
	});
});

describe('round trips', () => {
	test('decode(encode(standard)) deep-equals standard for a fully populated source item', () => {
		const standard: MapSourceItem = {
			properties: {
				id: 'a',
				title: 'A',
				category: LocationCategoryEnum.Temple,
				status: LocationStatusEnum.Abandoned,
				precision: 3,
				quality: 4,
				rating: 5,
				objective: 2,
				outlier: true,
				hasImage: true,
				regionOrdinals: [1, 2],
				themeIndices: [3],
				chunkKey: '7',
			},
			geometry: {
				type: GeometryTypeEnum.LineString,
				coordinates: [
					[100, 13],
					[101, 14],
				],
			},
		};

		expect(MapSourceItemSchema.parse(z.encode(MapSourceItemSchema, standard))).toEqual(standard);
	});

	test('decode(encode(standard)) deep-equals standard for a popup item with image', () => {
		const standard: MapPopupItem = {
			id: 'a',
			title: 'A',
			titleMultilingualLang: 'zh',
			titleMultilingualValue: '寺',
			url: '/a',
			description: 'desc',
			safety: 2,
			googleMapsUrl: 'maps.app.goo.gl/abc',
			wikipediaUrl: 'en.wikipedia.org/wiki/A',
			image: { srcSet: '/a.jpg 1x' },
		};

		expect(MapPopupItemSchema.parse(z.encode(MapPopupItemSchema, standard))).toEqual(standard);
	});

	test('array encode helpers map every item', () => {
		const source: Array<MapSourceItem> = [
			{
				properties: {
					id: 'a',
					title: 'A',
					category: LocationCategoryEnum.Temple,
					status: LocationStatusEnum.Abandoned,
					precision: 1,
					quality: 1,
					rating: 1,
					hasImage: false,
				},
				geometry: { type: GeometryTypeEnum.Point, coordinates: [0, 0] },
			},
		];
		const popup: Array<MapPopupItem> = [{ id: 'a', title: 'A', image: undefined }];

		expect(encodeMapSourceData(source)).toHaveLength(1);
		expect(encodeMapPopupData(popup)).toHaveLength(1);
	});
});
