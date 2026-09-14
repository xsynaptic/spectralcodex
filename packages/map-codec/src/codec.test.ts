import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import type { MapPopupItem, MapSourceItem } from '#codec.ts';

import { MapPopupItemSchema, MapSourceItemSchema } from '#codec.ts';
import {
	LocationCategoryNumericMapping,
	LocationStatusNumericMapping,
	MapDataGeometryTypeNumericMapping,
	MapDataKeysCompressed,
} from '#map-data-keys.ts';

function byCodePoint(first: string, second: string): number {
	return first.localeCompare(second);
}

describe('MapSourceItemSchema decode', () => {
	test('decompresses keys, inverts numeric enum codes, applies hasImage default', () => {
		const result = MapSourceItemSchema.parse({
			[MapDataKeysCompressed.Category]: LocationCategoryNumericMapping[LocationCategoryEnum.Temple],
			[MapDataKeysCompressed.EntryQuality]: 4,
			[MapDataKeysCompressed.Geometry]: {
				[MapDataKeysCompressed.GeometryCoordinates]: [100, 13],
				[MapDataKeysCompressed.GeometryType]:
					MapDataGeometryTypeNumericMapping[GeometryTypeEnum.Point],
			},
			[MapDataKeysCompressed.Id]: 'location-1',
			[MapDataKeysCompressed.Objective]: 2,
			[MapDataKeysCompressed.Precision]: 3,
			[MapDataKeysCompressed.Rating]: 5,
			[MapDataKeysCompressed.Status]: LocationStatusNumericMapping[LocationStatusEnum.Abandoned],
			[MapDataKeysCompressed.Title]: 'Location',
		});

		expect(result).toEqual({
			geometry: {
				coordinates: [100, 13],
				type: GeometryTypeEnum.Point,
			},
			properties: {
				category: LocationCategoryEnum.Temple,
				entryQuality: 4,
				hasImage: false,
				id: 'location-1',
				objective: 2,
				precision: 3,
				rating: 5,
				status: LocationStatusEnum.Abandoned,
				title: 'Location',
			},
		});
	});

	test('omits objective and outlier when absent', () => {
		const result = MapSourceItemSchema.parse({
			[MapDataKeysCompressed.Category]: LocationCategoryNumericMapping[LocationCategoryEnum.Temple],
			[MapDataKeysCompressed.EntryQuality]: 4,
			[MapDataKeysCompressed.Geometry]: {
				[MapDataKeysCompressed.GeometryCoordinates]: [100, 13],
				[MapDataKeysCompressed.GeometryType]:
					MapDataGeometryTypeNumericMapping[GeometryTypeEnum.Point],
			},
			[MapDataKeysCompressed.Id]: 'location-1',
			[MapDataKeysCompressed.Precision]: 3,
			[MapDataKeysCompressed.Rating]: 5,
			[MapDataKeysCompressed.Status]: LocationStatusNumericMapping[LocationStatusEnum.Abandoned],
			[MapDataKeysCompressed.Title]: 'Location',
		});

		expect('objective' in result.properties).toBe(false);
		expect('outlier' in result.properties).toBe(false);
	});
});

describe('MapPopupItemSchema decode', () => {
	test('assembles the image object when srcSet is present', () => {
		const result = MapPopupItemSchema.parse({
			[MapDataKeysCompressed.Id]: 'location-1',
			[MapDataKeysCompressed.ImageSrcSet]: '/image.jpg 1x',
			[MapDataKeysCompressed.Title]: 'Location',
			[MapDataKeysCompressed.Url]: '/location-1',
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
		geometry: { coordinates: [100, 13], type: GeometryTypeEnum.Point },
		properties: {
			category: LocationCategoryEnum.Temple,
			chunkKey: '0',
			entryQuality: 4,
			hasImage: true,
			id: 'a',
			objective: 2,
			outlier: false,
			precision: 3,
			rating: 5,
			regionOrdinals: [1, 2],
			status: LocationStatusEnum.Abandoned,
			themeIndices: [3],
			title: 'A',
		},
	};

	test('emits present optionals and hasImage flag', () => {
		expect(z.encode(MapSourceItemSchema, standardFull)).toEqual({
			[MapDataKeysCompressed.Category]: LocationCategoryNumericMapping[LocationCategoryEnum.Temple],
			[MapDataKeysCompressed.ChunkKey]: '0',
			[MapDataKeysCompressed.EntryQuality]: 4,
			[MapDataKeysCompressed.Geometry]: {
				[MapDataKeysCompressed.GeometryCoordinates]: [100, 13],
				[MapDataKeysCompressed.GeometryType]:
					MapDataGeometryTypeNumericMapping[GeometryTypeEnum.Point],
			},
			[MapDataKeysCompressed.HasImage]: true,
			[MapDataKeysCompressed.Id]: 'a',
			[MapDataKeysCompressed.Objective]: 2,
			[MapDataKeysCompressed.Outlier]: false,
			[MapDataKeysCompressed.Precision]: 3,
			[MapDataKeysCompressed.Rating]: 5,
			[MapDataKeysCompressed.RegionOrdinals]: [1, 2],
			[MapDataKeysCompressed.Status]: LocationStatusNumericMapping[LocationStatusEnum.Abandoned],
			[MapDataKeysCompressed.ThemeIndices]: [3],
			[MapDataKeysCompressed.Title]: 'A',
		});
	});

	test('omits absent optionals; never emits hasImage:false', () => {
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
				MapDataKeysCompressed.EntryQuality,
				MapDataKeysCompressed.Rating,
				MapDataKeysCompressed.Geometry,
			].sort(byCodePoint),
		);
	});
});

describe('round trips', () => {
	test('decode(encode(standard)) deep-equals standard for a fully populated source item', () => {
		const standard: MapSourceItem = {
			geometry: {
				coordinates: [
					[100, 13],
					[101, 14],
				],
				type: GeometryTypeEnum.LineString,
			},
			properties: {
				category: LocationCategoryEnum.Temple,
				chunkKey: '7',
				entryQuality: 4,
				hasImage: true,
				id: 'a',
				objective: 2,
				outlier: true,
				precision: 3,
				rating: 5,
				regionOrdinals: [1, 2],
				status: LocationStatusEnum.Abandoned,
				themeIndices: [3],
				title: 'A',
			},
		};

		expect(MapSourceItemSchema.parse(z.encode(MapSourceItemSchema, standard))).toEqual(standard);
	});

	test('decode(encode(standard)) deep-equals standard for a popup item with image', () => {
		const standard: MapPopupItem = {
			description: 'desc',
			googleMapsUrl: 'maps.app.goo.gl/abc',
			id: 'a',
			image: { srcSet: '/a.jpg 1x' },
			safety: 2,
			title: 'A',
			titleMultilingualLang: 'zh',
			titleMultilingualValue: '寺',
			url: '/a',
			wikipediaUrl: 'en.wikipedia.org/wiki/A',
		};

		expect(MapPopupItemSchema.parse(z.encode(MapPopupItemSchema, standard))).toEqual(standard);
	});
});
