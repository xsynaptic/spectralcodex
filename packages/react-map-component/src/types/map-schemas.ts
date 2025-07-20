import {
	LocationCategoryEnum,
	LocationCategoryNumericMapping,
	LocationStatusEnum,
	LocationStatusNumericMapping,
	MapDataGeometryTypeNumericMapping,
	MapDataKeyMap,
	MapDataKeys,
	MapDataKeysCompressed,
} from '@spectralcodex/map-types';
import * as R from 'remeda';
import { z } from 'zod';

const NumericScaleSchema = z.number().int().min(1).max(5);

export const MapSourceItemSchema = z
	.object({
		[MapDataKeysCompressed.Id]: z.string(),
		[MapDataKeysCompressed.Title]: z.string(),
		[MapDataKeysCompressed.Category]: z.nativeEnum(LocationCategoryNumericMapping),
		[MapDataKeysCompressed.Status]: z.nativeEnum(LocationStatusNumericMapping),
		[MapDataKeysCompressed.Precision]: NumericScaleSchema,
		[MapDataKeysCompressed.Quality]: NumericScaleSchema,
		[MapDataKeysCompressed.Rating]: NumericScaleSchema,
		[MapDataKeysCompressed.Objective]: NumericScaleSchema.optional(),
		[MapDataKeysCompressed.Outlier]: z.boolean().optional(),
		[MapDataKeysCompressed.HasImage]: z.boolean().optional(),
		[MapDataKeysCompressed.Geometry]: z.object({
			[MapDataKeysCompressed.GeometryType]: z.nativeEnum(MapDataGeometryTypeNumericMapping),
			[MapDataKeysCompressed.GeometryCoordinates]: z.union([
				z.tuple([z.number(), z.number()]), // Point
				z.tuple([z.number(), z.number()]).array(), // LineString
				z.tuple([z.number(), z.number()]).array().array(), // Polygon
			]),
		}),
	})
	.strict()
	.transform((value) => ({
		properties: {
			[MapDataKeys.Id]: value[MapDataKeyMap[MapDataKeys.Id]],
			[MapDataKeys.Title]: value[MapDataKeyMap[MapDataKeys.Title]],
			[MapDataKeys.Category]:
				R.invert(LocationCategoryNumericMapping)[value[MapDataKeyMap[MapDataKeys.Category]]] ??
				LocationCategoryEnum.Unknown,
			[MapDataKeys.Status]:
				R.invert(LocationStatusNumericMapping)[value[MapDataKeyMap[MapDataKeys.Status]]] ??
				LocationStatusEnum.Unknown,
			[MapDataKeys.Precision]: value[MapDataKeyMap[MapDataKeys.Precision]],
			[MapDataKeys.Quality]: value[MapDataKeyMap[MapDataKeys.Quality]],
			[MapDataKeys.Rating]: value[MapDataKeyMap[MapDataKeys.Rating]],
			[MapDataKeys.Objective]: value[MapDataKeyMap[MapDataKeys.Objective]],
			[MapDataKeys.Outlier]: value[MapDataKeyMap[MapDataKeys.Outlier]] ?? false,
			[MapDataKeys.HasImage]: value[MapDataKeyMap[MapDataKeys.HasImage]] ?? false,
		},
		[MapDataKeys.Geometry]: {
			[MapDataKeys.GeometryType]: R.invert(MapDataGeometryTypeNumericMapping)[
				value[MapDataKeyMap[MapDataKeys.Geometry]][MapDataKeyMap[MapDataKeys.GeometryType]]
			],
			[MapDataKeys.GeometryCoordinates]:
				value[MapDataKeyMap[MapDataKeys.Geometry]][MapDataKeyMap[MapDataKeys.GeometryCoordinates]],
		},
	}));

export const MapPopupItemSchema = z
	.object({
		[MapDataKeysCompressed.Id]: z.string(),
		[MapDataKeysCompressed.Title]: z.string(),
		[MapDataKeysCompressed.TitleMultilingualLang]: z.string().optional(),
		[MapDataKeysCompressed.TitleMultilingualValue]: z.string().optional(),
		[MapDataKeysCompressed.Url]: z.string().optional(),
		[MapDataKeysCompressed.Description]: z.string().optional(),
		[MapDataKeysCompressed.Safety]: NumericScaleSchema.optional(),
		[MapDataKeysCompressed.GoogleMapsUrl]: z.string().optional(),
		[MapDataKeysCompressed.WikipediaUrl]: z.string().optional(),
		[MapDataKeysCompressed.ImageSrc]: z.string().optional(),
		[MapDataKeysCompressed.ImageSrcSet]: z.string().optional(),
		[MapDataKeysCompressed.ImageHeight]: z.string().optional(),
		[MapDataKeysCompressed.ImageWidth]: z.string().optional(),
	})
	.strict()
	.transform((value) => ({
		[MapDataKeys.Id]: value[MapDataKeyMap[MapDataKeys.Id]],
		[MapDataKeys.Title]: value[MapDataKeyMap[MapDataKeys.Title]],
		[MapDataKeys.TitleMultilingualLang]: value[MapDataKeyMap[MapDataKeys.TitleMultilingualLang]],
		[MapDataKeys.TitleMultilingualValue]: value[MapDataKeyMap[MapDataKeys.TitleMultilingualValue]],
		[MapDataKeys.Url]: value[MapDataKeyMap[MapDataKeys.Url]],
		[MapDataKeys.Description]: value[MapDataKeyMap[MapDataKeys.Description]],
		[MapDataKeys.Safety]: value[MapDataKeyMap[MapDataKeys.Safety]],
		[MapDataKeys.GoogleMapsUrl]: value[MapDataKeyMap[MapDataKeys.GoogleMapsUrl]],
		[MapDataKeys.WikipediaUrl]: value[MapDataKeyMap[MapDataKeys.WikipediaUrl]],
		...(value[MapDataKeyMap[MapDataKeys.ImageSrc]] === undefined ||
		value[MapDataKeyMap[MapDataKeys.ImageSrcSet]] === undefined ||
		value[MapDataKeyMap[MapDataKeys.ImageHeight]] === undefined ||
		value[MapDataKeyMap[MapDataKeys.ImageWidth]] === undefined
			? { [MapDataKeys.Image]: undefined }
			: {
					[MapDataKeys.Image]: {
						[MapDataKeys.ImageSrc]: value[MapDataKeyMap[MapDataKeys.ImageSrc]],
						[MapDataKeys.ImageSrcSet]: value[MapDataKeyMap[MapDataKeys.ImageSrcSet]],
						[MapDataKeys.ImageHeight]: value[MapDataKeyMap[MapDataKeys.ImageHeight]],
						[MapDataKeys.ImageWidth]: value[MapDataKeyMap[MapDataKeys.ImageWidth]],
					},
				}),
	}));
