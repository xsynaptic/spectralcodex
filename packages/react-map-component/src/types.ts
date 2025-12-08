import type { Flavor } from '@protomaps/basemaps';
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { MapOptions } from 'maplibre-gl';
import type { CSSProperties } from 'react';

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
import { invert } from 'remeda';
import { z } from 'zod';

// Supported geometry for use with this component
export type MapGeometry = Point | LineString | Polygon;

const NumericScaleSchema = z.number().int().min(1).max(5);

/**
 * Map source data
 */
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
		[MapDataKeysCompressed.Outlier]: z.boolean().optional().default(false),
		[MapDataKeysCompressed.HasImage]: z.boolean().optional().default(false),
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
				invert(LocationCategoryNumericMapping)[value[MapDataKeyMap[MapDataKeys.Category]]] ??
				LocationCategoryEnum.Unknown,
			[MapDataKeys.Status]:
				invert(LocationStatusNumericMapping)[value[MapDataKeyMap[MapDataKeys.Status]]] ??
				LocationStatusEnum.Unknown,
			[MapDataKeys.Precision]: value[MapDataKeyMap[MapDataKeys.Precision]],
			[MapDataKeys.Quality]: value[MapDataKeyMap[MapDataKeys.Quality]],
			[MapDataKeys.Rating]: value[MapDataKeyMap[MapDataKeys.Rating]],
			...(value[MapDataKeyMap[MapDataKeys.Objective]]
				? { [MapDataKeys.Objective]: value[MapDataKeyMap[MapDataKeys.Objective]] }
				: {}),
			[MapDataKeys.Outlier]: value[MapDataKeyMap[MapDataKeys.Outlier]],
			[MapDataKeys.HasImage]: value[MapDataKeyMap[MapDataKeys.HasImage]],
		},
		[MapDataKeys.Geometry]: {
			[MapDataKeys.GeometryType]: invert(MapDataGeometryTypeNumericMapping)[
				value[MapDataKeyMap[MapDataKeys.Geometry]][MapDataKeyMap[MapDataKeys.GeometryType]]
			],
			[MapDataKeys.GeometryCoordinates]:
				value[MapDataKeyMap[MapDataKeys.Geometry]][MapDataKeyMap[MapDataKeys.GeometryCoordinates]],
		},
	}));

export type MapSourceItemInput = z.input<typeof MapSourceItemSchema>;

export type MapSourceItemParsed = z.output<typeof MapSourceItemSchema>;

export type MapSourceFeatureCollection = FeatureCollection<
	MapGeometry,
	MapSourceItemParsed['properties']
>;

/**
 * Map popup data
 */
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

export type MapPopupItemInput = z.input<typeof MapPopupItemSchema>;

export type MapPopupItemParsed = z.output<typeof MapPopupItemSchema>;

/**
 * Map component props
 */
export interface MapComponentProps extends Partial<
	Pick<MapOptions, 'bounds' | 'maxBounds' | 'zoom' | 'interactive' | 'hash'>
> {
	apiSourceUrl?: string | undefined;
	apiPopupUrl?: string | undefined;
	apiDivisionUrl?: string | undefined;
	sourceData?: Array<MapSourceItemInput> | undefined;
	popupData?: Array<MapPopupItemInput> | undefined;
	baseMapTheme?: Flavor | undefined;
	center?: [number, number];
	cluster?: boolean | undefined;
	showObjectiveFilter?: boolean | undefined;
	languages?: Array<string> | undefined;
	protomapsApiKey?: string | undefined;
	spritesId?: string | undefined;
	spritesUrl?: string | undefined;
	style?: CSSProperties | undefined;
	version?: string | undefined;
	isDev?: boolean | undefined;
}

// Used within Astro to determine whether a map should be rendered
export interface MapComponentData extends MapComponentProps {
	hasGeodata: boolean;
	featureCount: number;
	prefetchUrls?: Array<string> | undefined;
}
