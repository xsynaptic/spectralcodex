import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationCategoryNumericMapping,
	LocationStatusEnum,
	LocationStatusNumericMapping,
	MapDataGeometryTypeNumericMapping,
	MapDataKeysCompressed,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import { MapPopupItemSchema, MapSourceItemSchema } from './types';

describe('MapSourceItemSchema', () => {
	test('decompresses keys, inverts numeric enum codes, applies defaults', () => {
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
				outlier: false,
				hasImage: false,
			},
			geometry: {
				type: GeometryTypeEnum.Point,
				coordinates: [100, 13],
			},
		});
	});

	test('omits objective when absent', () => {
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
	});
});

describe('MapPopupItemSchema', () => {
	test('assembles the image object when srcSet is present', () => {
		const result = MapPopupItemSchema.parse({
			[MapDataKeysCompressed.Id]: 'location-1',
			[MapDataKeysCompressed.Title]: 'Location',
			[MapDataKeysCompressed.Url]: '/location-1',
			[MapDataKeysCompressed.ImageSrcSet]: '/image.jpg 1x',
		});

		expect(result.url).toBe('/location-1');
		expect(result.image).toEqual({
			srcSet: '/image.jpg 1x',
		});
	});

	test('leaves image undefined when srcSet is absent', () => {
		const result = MapPopupItemSchema.parse({
			[MapDataKeysCompressed.Id]: 'location-1',
			[MapDataKeysCompressed.Title]: 'Location',
		});

		expect(result.image).toBeUndefined();
	});
});
