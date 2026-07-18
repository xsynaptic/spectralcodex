import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationCategoryNumericMapping,
	LocationStatusEnum,
	LocationStatusNumericMapping,
} from '@spectralcodex/shared/map';
import { z } from 'zod';

import {
	MapDataGeometryTypeNumericMapping,
	MapDataKeys,
	MapDataKeysCompressed,
} from './map-data-keys';

type GeometryType = (typeof GeometryTypeEnum)[keyof typeof GeometryTypeEnum];

// Numeric-code -> readable-value lookups for the decode direction
function invertNumericMapping<Value extends string>(
	mapping: Record<Value, number>,
): Record<number, Value> {
	const inverse: Record<number, Value> = {};
	for (const value of Object.keys(mapping) as Array<Value>) {
		inverse[mapping[value]] = value;
	}
	return inverse;
}

const categoryByCode = invertNumericMapping(LocationCategoryNumericMapping);
const statusByCode = invertNumericMapping(LocationStatusNumericMapping);
const geometryTypeByCode = invertNumericMapping<GeometryType>(MapDataGeometryTypeNumericMapping);

const coordinatesSchema = z.union([
	z.tuple([z.number(), z.number()]), // Point
	z.tuple([z.number(), z.number()]).array(), // LineString
	z.tuple([z.number(), z.number()]).array().array(), // Polygon
]);

/**
 * Map source item: compressed form <-> standard form
 */
const sourceCompressedSchema = z
	.object({
		[MapDataKeysCompressed.Id]: z.string(),
		[MapDataKeysCompressed.Title]: z.string(),
		[MapDataKeysCompressed.Category]: z.enum(LocationCategoryNumericMapping),
		[MapDataKeysCompressed.Status]: z.enum(LocationStatusNumericMapping),
		[MapDataKeysCompressed.Precision]: z.number().int(),
		[MapDataKeysCompressed.Quality]: z.number().int(),
		[MapDataKeysCompressed.Rating]: z.number().int(),
		[MapDataKeysCompressed.Objective]: z.number().int().optional(),
		// Defaults live in decode, not here, so encode does not re-add omitted keys
		[MapDataKeysCompressed.Outlier]: z.boolean().optional(),
		[MapDataKeysCompressed.HasImage]: z.boolean().optional(),
		// Shared-index membership columns; region/theme scope the index before parse, chunk key survives for popup lookup
		[MapDataKeysCompressed.RegionOrdinals]: z.number().int().array().optional(),
		[MapDataKeysCompressed.ThemeIndices]: z.number().int().array().optional(),
		[MapDataKeysCompressed.ChunkKey]: z.string().optional(),
		[MapDataKeysCompressed.Geometry]: z.object({
			[MapDataKeysCompressed.GeometryType]: z.enum(MapDataGeometryTypeNumericMapping),
			[MapDataKeysCompressed.GeometryCoordinates]: coordinatesSchema,
		}),
	})
	.strict();

const sourceStandardSchema = z.object({
	properties: z.object({
		[MapDataKeys.Id]: z.string(),
		[MapDataKeys.Title]: z.string(),
		[MapDataKeys.Category]: z.enum(LocationCategoryEnum),
		[MapDataKeys.Status]: z.enum(LocationStatusEnum),
		[MapDataKeys.Precision]: z.number().int(),
		[MapDataKeys.Quality]: z.number().int(),
		[MapDataKeys.Rating]: z.number().int(),
		[MapDataKeys.Objective]: z.number().int().optional(),
		[MapDataKeys.Outlier]: z.boolean().optional(),
		[MapDataKeys.HasImage]: z.boolean(),
		[MapDataKeys.RegionOrdinals]: z.number().int().array().optional(),
		[MapDataKeys.ThemeIndices]: z.number().int().array().optional(),
		[MapDataKeys.ChunkKey]: z.string().optional(),
	}),
	[MapDataKeys.Geometry]: z.object({
		[MapDataKeys.GeometryType]: z.enum(GeometryTypeEnum),
		[MapDataKeys.GeometryCoordinates]: coordinatesSchema,
	}),
});

export const MapSourceItemSchema = z.codec(sourceCompressedSchema, sourceStandardSchema, {
	decode: (data) => {
		const objective = data[MapDataKeysCompressed.Objective];
		const outlier = data[MapDataKeysCompressed.Outlier];
		const regionOrdinals = data[MapDataKeysCompressed.RegionOrdinals];
		const themeIndices = data[MapDataKeysCompressed.ThemeIndices];
		const chunkKey = data[MapDataKeysCompressed.ChunkKey];

		return {
			properties: {
				[MapDataKeys.Id]: data[MapDataKeysCompressed.Id],
				[MapDataKeys.Title]: data[MapDataKeysCompressed.Title],
				[MapDataKeys.Category]:
					categoryByCode[data[MapDataKeysCompressed.Category]] ?? LocationCategoryEnum.Unknown,
				[MapDataKeys.Status]:
					statusByCode[data[MapDataKeysCompressed.Status]] ?? LocationStatusEnum.Unknown,
				[MapDataKeys.Precision]: data[MapDataKeysCompressed.Precision],
				[MapDataKeys.Quality]: data[MapDataKeysCompressed.Quality],
				[MapDataKeys.Rating]: data[MapDataKeysCompressed.Rating],
				...(objective === undefined ? {} : { [MapDataKeys.Objective]: objective }),
				...(outlier === undefined ? {} : { [MapDataKeys.Outlier]: outlier }),
				[MapDataKeys.HasImage]: data[MapDataKeysCompressed.HasImage] ?? false,
				...(regionOrdinals ? { [MapDataKeys.RegionOrdinals]: regionOrdinals } : {}),
				...(themeIndices ? { [MapDataKeys.ThemeIndices]: themeIndices } : {}),
				...(chunkKey ? { [MapDataKeys.ChunkKey]: chunkKey } : {}),
			},
			[MapDataKeys.Geometry]: {
				[MapDataKeys.GeometryType]:
					geometryTypeByCode[
						data[MapDataKeysCompressed.Geometry][MapDataKeysCompressed.GeometryType]
					] ?? GeometryTypeEnum.Point,
				[MapDataKeys.GeometryCoordinates]:
					data[MapDataKeysCompressed.Geometry][MapDataKeysCompressed.GeometryCoordinates],
			},
		};
	},
	encode: (data) => {
		const properties = data.properties;
		const objective = properties[MapDataKeys.Objective];
		const outlier = properties[MapDataKeys.Outlier];
		const hasImage = properties[MapDataKeys.HasImage];
		const regionOrdinals = properties[MapDataKeys.RegionOrdinals];
		const themeIndices = properties[MapDataKeys.ThemeIndices];
		const chunkKey = properties[MapDataKeys.ChunkKey];

		return {
			[MapDataKeysCompressed.Id]: properties[MapDataKeys.Id],
			[MapDataKeysCompressed.Title]: properties[MapDataKeys.Title],
			[MapDataKeysCompressed.Category]:
				LocationCategoryNumericMapping[properties[MapDataKeys.Category]],
			[MapDataKeysCompressed.Status]: LocationStatusNumericMapping[properties[MapDataKeys.Status]],
			[MapDataKeysCompressed.Precision]: properties[MapDataKeys.Precision],
			[MapDataKeysCompressed.Quality]: properties[MapDataKeys.Quality],
			[MapDataKeysCompressed.Rating]: properties[MapDataKeys.Rating],
			...(objective === undefined ? {} : { [MapDataKeysCompressed.Objective]: objective }),
			...(outlier === undefined ? {} : { [MapDataKeysCompressed.Outlier]: outlier }),
			...(hasImage ? { [MapDataKeysCompressed.HasImage]: true } : {}),
			...(regionOrdinals ? { [MapDataKeysCompressed.RegionOrdinals]: regionOrdinals } : {}),
			...(themeIndices ? { [MapDataKeysCompressed.ThemeIndices]: themeIndices } : {}),
			...(chunkKey ? { [MapDataKeysCompressed.ChunkKey]: chunkKey } : {}),
			[MapDataKeysCompressed.Geometry]: {
				[MapDataKeysCompressed.GeometryType]:
					MapDataGeometryTypeNumericMapping[data[MapDataKeys.Geometry][MapDataKeys.GeometryType]],
				[MapDataKeysCompressed.GeometryCoordinates]:
					data[MapDataKeys.Geometry][MapDataKeys.GeometryCoordinates],
			},
		};
	},
});

/**
 * Map popup item: compressed form <-> standard form
 */
const popupCompressedSchema = z
	.object({
		[MapDataKeysCompressed.Id]: z.string(),
		[MapDataKeysCompressed.Title]: z.string(),
		[MapDataKeysCompressed.TitleMultilingualLang]: z.string().optional(),
		[MapDataKeysCompressed.TitleMultilingualValue]: z.string().optional(),
		[MapDataKeysCompressed.Url]: z.string().optional(),
		[MapDataKeysCompressed.Description]: z.string().optional(),
		[MapDataKeysCompressed.Safety]: z.number().int().optional(),
		[MapDataKeysCompressed.GoogleMapsUrl]: z.string().optional(),
		[MapDataKeysCompressed.WikipediaUrl]: z.string().optional(),
		[MapDataKeysCompressed.ImageSrcSet]: z.string().optional(),
	})
	.strict();

const popupStandardSchema = z.object({
	[MapDataKeys.Id]: z.string(),
	[MapDataKeys.Title]: z.string(),
	[MapDataKeys.TitleMultilingualLang]: z.string().optional(),
	[MapDataKeys.TitleMultilingualValue]: z.string().optional(),
	[MapDataKeys.Url]: z.string().optional(),
	[MapDataKeys.Description]: z.string().optional(),
	[MapDataKeys.Safety]: z.number().int().optional(),
	[MapDataKeys.GoogleMapsUrl]: z.string().optional(),
	[MapDataKeys.WikipediaUrl]: z.string().optional(),
	[MapDataKeys.Image]: z.object({ [MapDataKeys.ImageSrcSet]: z.string() }).optional(),
});

export const MapPopupItemSchema = z.codec(popupCompressedSchema, popupStandardSchema, {
	decode: (data) => {
		const srcSet = data[MapDataKeysCompressed.ImageSrcSet];

		return {
			[MapDataKeys.Id]: data[MapDataKeysCompressed.Id],
			[MapDataKeys.Title]: data[MapDataKeysCompressed.Title],
			[MapDataKeys.TitleMultilingualLang]: data[MapDataKeysCompressed.TitleMultilingualLang],
			[MapDataKeys.TitleMultilingualValue]: data[MapDataKeysCompressed.TitleMultilingualValue],
			[MapDataKeys.Url]: data[MapDataKeysCompressed.Url],
			[MapDataKeys.Description]: data[MapDataKeysCompressed.Description],
			[MapDataKeys.Safety]: data[MapDataKeysCompressed.Safety],
			[MapDataKeys.GoogleMapsUrl]: data[MapDataKeysCompressed.GoogleMapsUrl],
			[MapDataKeys.WikipediaUrl]: data[MapDataKeysCompressed.WikipediaUrl],
			[MapDataKeys.Image]: srcSet ? { [MapDataKeys.ImageSrcSet]: srcSet } : undefined,
		};
	},
	encode: (data) => {
		const image = data[MapDataKeys.Image];

		return {
			[MapDataKeysCompressed.Id]: data[MapDataKeys.Id],
			[MapDataKeysCompressed.Title]: data[MapDataKeys.Title],
			[MapDataKeysCompressed.TitleMultilingualLang]: data[MapDataKeys.TitleMultilingualLang],
			[MapDataKeysCompressed.TitleMultilingualValue]: data[MapDataKeys.TitleMultilingualValue],
			[MapDataKeysCompressed.Url]: data[MapDataKeys.Url],
			[MapDataKeysCompressed.Description]: data[MapDataKeys.Description],
			[MapDataKeysCompressed.Safety]: data[MapDataKeys.Safety],
			[MapDataKeysCompressed.GoogleMapsUrl]: data[MapDataKeys.GoogleMapsUrl],
			[MapDataKeysCompressed.WikipediaUrl]: data[MapDataKeys.WikipediaUrl],
			...(image === undefined
				? {}
				: { [MapDataKeysCompressed.ImageSrcSet]: image[MapDataKeys.ImageSrcSet] }),
		};
	},
});

// Compressed input types
export type MapSourceItemCompressed = z.input<typeof MapSourceItemSchema>;
export type MapPopupItemCompressed = z.input<typeof MapPopupItemSchema>;

// Standard output types
export type MapSourceItem = z.output<typeof MapSourceItemSchema>;
export type MapPopupItem = z.output<typeof MapPopupItemSchema>;

// Encode a standard array to the compressed form at a serialization edge
export function encodeMapSourceData(
	items: ReadonlyArray<MapSourceItem>,
): Array<MapSourceItemCompressed> {
	return items.map((item) => z.encode(MapSourceItemSchema, item));
}

export function encodeMapPopupData(
	items: ReadonlyArray<MapPopupItem>,
): Array<MapPopupItemCompressed> {
	return items.map((item) => z.encode(MapPopupItemSchema, item));
}
