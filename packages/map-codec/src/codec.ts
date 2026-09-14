import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';
import { z } from 'zod';

import {
	LocationCategoryNumericMapping,
	LocationStatusNumericMapping,
	MapDataGeometryTypeNumericMapping,
	MapDataKeys,
	MapDataKeysCompressed,
} from '#map-data-keys.ts';

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

function withoutUndefined<T extends object>(object: T): T {
	return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined)) as T;
}

const coordinatesSchema = z.union([
	z.tuple([z.number(), z.number()]), // Point
	z.tuple([z.number(), z.number()]).array(), // LineString
	z.tuple([z.number(), z.number()]).array().array(), // Polygon
]);

// Map source item: compressed form <-> standard form
const sourceCompressedSchema = z
	.object({
		[MapDataKeysCompressed.Category]: z.enum(LocationCategoryNumericMapping),
		// Survives region/theme scoping of the shared index, for popup lookup
		[MapDataKeysCompressed.ChunkKey]: z.string().optional(),
		[MapDataKeysCompressed.EntryQuality]: z.number().int(),
		[MapDataKeysCompressed.Geometry]: z.object({
			[MapDataKeysCompressed.GeometryCoordinates]: coordinatesSchema,
			[MapDataKeysCompressed.GeometryType]: z.enum(MapDataGeometryTypeNumericMapping),
		}),
		// Defaults live in decode, not here, so encode does not re-add omitted keys
		[MapDataKeysCompressed.HasImage]: z.boolean().optional(),
		[MapDataKeysCompressed.Id]: z.string(),
		[MapDataKeysCompressed.Objective]: z.number().int().optional(),
		[MapDataKeysCompressed.Outlier]: z.boolean().optional(),
		[MapDataKeysCompressed.Precision]: z.number().int(),
		[MapDataKeysCompressed.Rating]: z.number().int(),
		// Shared-index membership columns, as are theme indices; region/theme scope the index before parse
		[MapDataKeysCompressed.RegionOrdinals]: z.number().int().array().optional(),
		[MapDataKeysCompressed.Status]: z.enum(LocationStatusNumericMapping),
		[MapDataKeysCompressed.ThemeIndices]: z.number().int().array().optional(),
		[MapDataKeysCompressed.Title]: z.string(),
	})
	.strict();

const sourceStandardSchema = z.object({
	[MapDataKeys.Geometry]: z.object({
		[MapDataKeys.GeometryCoordinates]: coordinatesSchema,
		[MapDataKeys.GeometryType]: z.enum(GeometryTypeEnum),
	}),
	properties: z.object({
		[MapDataKeys.Category]: z.enum(LocationCategoryEnum),
		[MapDataKeys.ChunkKey]: z.string().optional(),
		[MapDataKeys.EntryQuality]: z.number().int(),
		[MapDataKeys.HasImage]: z.boolean(),
		[MapDataKeys.Id]: z.string(),
		[MapDataKeys.Objective]: z.number().int().optional(),
		[MapDataKeys.Outlier]: z.boolean().optional(),
		[MapDataKeys.Precision]: z.number().int(),
		[MapDataKeys.Rating]: z.number().int(),
		[MapDataKeys.RegionOrdinals]: z.number().int().array().optional(),
		[MapDataKeys.Status]: z.enum(LocationStatusEnum),
		[MapDataKeys.ThemeIndices]: z.number().int().array().optional(),
		[MapDataKeys.Title]: z.string(),
	}),
});

export const MapSourceItemSchema = z.codec(sourceCompressedSchema, sourceStandardSchema, {
	decode: (data) => ({
		[MapDataKeys.Geometry]: {
			[MapDataKeys.GeometryCoordinates]:
				data[MapDataKeysCompressed.Geometry][MapDataKeysCompressed.GeometryCoordinates],
			[MapDataKeys.GeometryType]:
				geometryTypeByCode[
					data[MapDataKeysCompressed.Geometry][MapDataKeysCompressed.GeometryType]
				] ?? GeometryTypeEnum.Point,
		},
		properties: withoutUndefined({
			[MapDataKeys.Category]:
				categoryByCode[data[MapDataKeysCompressed.Category]] ?? LocationCategoryEnum.Unknown,
			[MapDataKeys.ChunkKey]: data[MapDataKeysCompressed.ChunkKey],
			[MapDataKeys.EntryQuality]: data[MapDataKeysCompressed.EntryQuality],
			[MapDataKeys.HasImage]: data[MapDataKeysCompressed.HasImage] ?? false,
			[MapDataKeys.Id]: data[MapDataKeysCompressed.Id],
			[MapDataKeys.Objective]: data[MapDataKeysCompressed.Objective],
			[MapDataKeys.Outlier]: data[MapDataKeysCompressed.Outlier],
			[MapDataKeys.Precision]: data[MapDataKeysCompressed.Precision],
			[MapDataKeys.Rating]: data[MapDataKeysCompressed.Rating],
			[MapDataKeys.RegionOrdinals]: data[MapDataKeysCompressed.RegionOrdinals],
			[MapDataKeys.Status]:
				statusByCode[data[MapDataKeysCompressed.Status]] ?? LocationStatusEnum.Unknown,
			[MapDataKeys.ThemeIndices]: data[MapDataKeysCompressed.ThemeIndices],
			[MapDataKeys.Title]: data[MapDataKeysCompressed.Title],
		}),
	}),
	encode: (data) => {
		const properties = data.properties;
		const geometry = data[MapDataKeys.Geometry];

		return withoutUndefined({
			[MapDataKeysCompressed.Category]:
				LocationCategoryNumericMapping[properties[MapDataKeys.Category]],
			[MapDataKeysCompressed.ChunkKey]: properties[MapDataKeys.ChunkKey],
			[MapDataKeysCompressed.EntryQuality]: properties[MapDataKeys.EntryQuality],
			[MapDataKeysCompressed.Geometry]: {
				[MapDataKeysCompressed.GeometryCoordinates]: geometry[MapDataKeys.GeometryCoordinates],
				[MapDataKeysCompressed.GeometryType]:
					MapDataGeometryTypeNumericMapping[geometry[MapDataKeys.GeometryType]],
			},
			[MapDataKeysCompressed.HasImage]: properties[MapDataKeys.HasImage] ? true : undefined,
			[MapDataKeysCompressed.Id]: properties[MapDataKeys.Id],
			[MapDataKeysCompressed.Objective]: properties[MapDataKeys.Objective],
			[MapDataKeysCompressed.Outlier]: properties[MapDataKeys.Outlier],
			[MapDataKeysCompressed.Precision]: properties[MapDataKeys.Precision],
			[MapDataKeysCompressed.Rating]: properties[MapDataKeys.Rating],
			[MapDataKeysCompressed.RegionOrdinals]: properties[MapDataKeys.RegionOrdinals],
			[MapDataKeysCompressed.Status]: LocationStatusNumericMapping[properties[MapDataKeys.Status]],
			[MapDataKeysCompressed.ThemeIndices]: properties[MapDataKeys.ThemeIndices],
			[MapDataKeysCompressed.Title]: properties[MapDataKeys.Title],
		});
	},
});

// Map popup item: compressed form <-> standard form
const popupCompressedSchema = z
	.object({
		[MapDataKeysCompressed.Description]: z.string().optional(),
		[MapDataKeysCompressed.GoogleMapsUrl]: z.string().optional(),
		[MapDataKeysCompressed.Id]: z.string(),
		[MapDataKeysCompressed.ImageSrcSet]: z.string().optional(),
		[MapDataKeysCompressed.Safety]: z.number().int().optional(),
		[MapDataKeysCompressed.Title]: z.string(),
		[MapDataKeysCompressed.TitleMultilingualLang]: z.string().optional(),
		[MapDataKeysCompressed.TitleMultilingualValue]: z.string().optional(),
		[MapDataKeysCompressed.Url]: z.string().optional(),
		[MapDataKeysCompressed.WikipediaUrl]: z.string().optional(),
	})
	.strict();

const popupStandardSchema = z.object({
	[MapDataKeys.Description]: z.string().optional(),
	[MapDataKeys.GoogleMapsUrl]: z.string().optional(),
	[MapDataKeys.Id]: z.string(),
	[MapDataKeys.Image]: z.object({ [MapDataKeys.ImageSrcSet]: z.string() }).optional(),
	[MapDataKeys.Safety]: z.number().int().optional(),
	[MapDataKeys.Title]: z.string(),
	[MapDataKeys.TitleMultilingualLang]: z.string().optional(),
	[MapDataKeys.TitleMultilingualValue]: z.string().optional(),
	[MapDataKeys.Url]: z.string().optional(),
	[MapDataKeys.WikipediaUrl]: z.string().optional(),
});

export const MapPopupItemSchema = z.codec(popupCompressedSchema, popupStandardSchema, {
	decode: (data) => {
		const srcSet = data[MapDataKeysCompressed.ImageSrcSet];

		return {
			[MapDataKeys.Description]: data[MapDataKeysCompressed.Description],
			[MapDataKeys.GoogleMapsUrl]: data[MapDataKeysCompressed.GoogleMapsUrl],
			[MapDataKeys.Id]: data[MapDataKeysCompressed.Id],
			[MapDataKeys.Image]: srcSet ? { [MapDataKeys.ImageSrcSet]: srcSet } : undefined,
			[MapDataKeys.Safety]: data[MapDataKeysCompressed.Safety],
			[MapDataKeys.Title]: data[MapDataKeysCompressed.Title],
			[MapDataKeys.TitleMultilingualLang]: data[MapDataKeysCompressed.TitleMultilingualLang],
			[MapDataKeys.TitleMultilingualValue]: data[MapDataKeysCompressed.TitleMultilingualValue],
			[MapDataKeys.Url]: data[MapDataKeysCompressed.Url],
			[MapDataKeys.WikipediaUrl]: data[MapDataKeysCompressed.WikipediaUrl],
		};
	},
	encode: (data) => ({
		[MapDataKeysCompressed.Description]: data[MapDataKeys.Description],
		[MapDataKeysCompressed.GoogleMapsUrl]: data[MapDataKeys.GoogleMapsUrl],
		[MapDataKeysCompressed.Id]: data[MapDataKeys.Id],
		[MapDataKeysCompressed.ImageSrcSet]: data[MapDataKeys.Image]?.[MapDataKeys.ImageSrcSet],
		[MapDataKeysCompressed.Safety]: data[MapDataKeys.Safety],
		[MapDataKeysCompressed.Title]: data[MapDataKeys.Title],
		[MapDataKeysCompressed.TitleMultilingualLang]: data[MapDataKeys.TitleMultilingualLang],
		[MapDataKeysCompressed.TitleMultilingualValue]: data[MapDataKeys.TitleMultilingualValue],
		[MapDataKeysCompressed.Url]: data[MapDataKeys.Url],
		[MapDataKeysCompressed.WikipediaUrl]: data[MapDataKeys.WikipediaUrl],
	}),
});

export type MapPopupItem = z.output<typeof MapPopupItemSchema>;
export type MapPopupItemCompressed = z.input<typeof MapPopupItemSchema>;

// Standard output types
export type MapSourceItem = z.output<typeof MapSourceItemSchema>;
// Compressed input types
export type MapSourceItemCompressed = z.input<typeof MapSourceItemSchema>;

export function encodeMapPopupData(
	items: ReadonlyArray<MapPopupItem>,
): Array<MapPopupItemCompressed> {
	return items.map((item) => z.encode(MapPopupItemSchema, item));
}

// Encode a standard array to the compressed form at a serialization edge
export function encodeMapSourceData(
	items: ReadonlyArray<MapSourceItem>,
): Array<MapSourceItemCompressed> {
	return items.map((item) => z.encode(MapSourceItemSchema, item));
}
