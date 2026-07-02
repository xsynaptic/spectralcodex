import type { Flavor } from '@protomaps/basemaps';
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { MapOptions } from 'maplibre-gl';
import type { CSSProperties } from 'react';
import type { MapProps } from 'react-map-gl/maplibre';

import {
	LocationCategoryEnum,
	LocationCategoryNumericMapping,
	LocationStatusEnum,
	LocationStatusNumericMapping,
	MapDataGeometryTypeNumericMapping,
	MapDataKeyMap,
	MapDataKeys,
	MapDataKeysCompressed,
} from '@spectralcodex/shared/map';
import * as R from 'remeda';
import { z } from 'zod';

export type MapInitialViewState = MapProps['initialViewState'];

// Supported geometry for use with this component
export type MapGeometry = Point | LineString | Polygon;

/**
 * Map source data
 */
export const MapSourceItemSchema = z
	.object({
		[MapDataKeysCompressed.Id]: z.string(),
		[MapDataKeysCompressed.Title]: z.string(),
		[MapDataKeysCompressed.Category]: z.enum(LocationCategoryNumericMapping),
		[MapDataKeysCompressed.Status]: z.enum(LocationStatusNumericMapping),
		[MapDataKeysCompressed.Precision]: z.number().int(),
		[MapDataKeysCompressed.Quality]: z.number().int(),
		[MapDataKeysCompressed.Rating]: z.number().int(),
		[MapDataKeysCompressed.Objective]: z.number().int().optional(),
		[MapDataKeysCompressed.Outlier]: z.boolean().optional().default(false),
		[MapDataKeysCompressed.HasImage]: z.boolean().optional().default(false),
		// Shared-index membership columns; region/theme values scope the index before parsing, chunk key survives for popup lookup
		[MapDataKeysCompressed.RegionOrdinals]: z.number().int().array().optional(),
		[MapDataKeysCompressed.ThemeIndices]: z.number().int().array().optional(),
		[MapDataKeysCompressed.ChunkKey]: z.string().optional(),
		[MapDataKeysCompressed.Geometry]: z.object({
			[MapDataKeysCompressed.GeometryType]: z.enum(MapDataGeometryTypeNumericMapping),
			[MapDataKeysCompressed.GeometryCoordinates]: z.union([
				z.tuple([z.number(), z.number()]), // Point
				z.tuple([z.number(), z.number()]).array(), // LineString
				z.tuple([z.number(), z.number()]).array().array(), // Polygon
			]),
		}),
	})
	.strict()
	.transform((value) => {
		const objective = value[MapDataKeyMap[MapDataKeys.Objective]];
		// Membership columns; region/theme values drive the per-map scope, chunk key drives popup lookup
		const regionOrdinals = value[MapDataKeyMap[MapDataKeys.RegionOrdinals]];
		const themeIndices = value[MapDataKeyMap[MapDataKeys.ThemeIndices]];
		const chunkKey = value[MapDataKeyMap[MapDataKeys.ChunkKey]];

		return {
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
				...(objective ? { [MapDataKeys.Objective]: objective } : {}),
				[MapDataKeys.Outlier]: value[MapDataKeyMap[MapDataKeys.Outlier]],
				[MapDataKeys.HasImage]: value[MapDataKeyMap[MapDataKeys.HasImage]],
				...(regionOrdinals ? { [MapDataKeys.RegionOrdinals]: regionOrdinals } : {}),
				...(themeIndices ? { [MapDataKeys.ThemeIndices]: themeIndices } : {}),
				...(chunkKey ? { [MapDataKeys.ChunkKey]: chunkKey } : {}),
			},
			[MapDataKeys.Geometry]: {
				[MapDataKeys.GeometryType]: R.invert(MapDataGeometryTypeNumericMapping)[
					value[MapDataKeyMap[MapDataKeys.Geometry]][MapDataKeyMap[MapDataKeys.GeometryType]]
				],
				[MapDataKeys.GeometryCoordinates]:
					value[MapDataKeyMap[MapDataKeys.Geometry]][
						MapDataKeyMap[MapDataKeys.GeometryCoordinates]
					],
			},
		};
	});

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
		[MapDataKeysCompressed.Safety]: z.number().int().optional(),
		[MapDataKeysCompressed.GoogleMapsUrl]: z.string().optional(),
		[MapDataKeysCompressed.WikipediaUrl]: z.string().optional(),
		[MapDataKeysCompressed.ImageSrcSet]: z.string().optional(),
	})
	.strict()
	.transform((value) => {
		const srcSet = value[MapDataKeyMap[MapDataKeys.ImageSrcSet]];

		const image = srcSet ? { [MapDataKeys.ImageSrcSet]: srcSet } : undefined;

		return {
			[MapDataKeys.Id]: value[MapDataKeyMap[MapDataKeys.Id]],
			[MapDataKeys.Title]: value[MapDataKeyMap[MapDataKeys.Title]],
			[MapDataKeys.TitleMultilingualLang]: value[MapDataKeyMap[MapDataKeys.TitleMultilingualLang]],
			[MapDataKeys.TitleMultilingualValue]:
				value[MapDataKeyMap[MapDataKeys.TitleMultilingualValue]],
			[MapDataKeys.Url]: value[MapDataKeyMap[MapDataKeys.Url]],
			[MapDataKeys.Description]: value[MapDataKeyMap[MapDataKeys.Description]],
			[MapDataKeys.Safety]: value[MapDataKeyMap[MapDataKeys.Safety]],
			[MapDataKeys.GoogleMapsUrl]: value[MapDataKeyMap[MapDataKeys.GoogleMapsUrl]],
			[MapDataKeys.WikipediaUrl]: value[MapDataKeyMap[MapDataKeys.WikipediaUrl]],
			[MapDataKeys.Image]: image,
		};
	});

export type MapPopupItemInput = z.input<typeof MapPopupItemSchema>;

export type MapPopupItemParsed = z.output<typeof MapPopupItemSchema>;

/**
 * Per-map scope over the shared global index; a big map keeps only the rows its scope selects
 * - region: keep points whose region ordinal falls inside the subtree interval
 * - theme: keep points carrying the theme index
 * - ids: keep the explicit, order-preserving feature-id list
 */
export type MapScope =
	| { type: 'region'; interval: [number, number] }
	| { type: 'theme'; index: number }
	| { type: 'ids'; ids: Array<string> };

/**
 * Map component props
 */
export interface MapComponentProps extends Partial<
	Pick<MapOptions, 'bounds' | 'maxBounds' | 'zoom' | 'interactive' | 'hash'>
> {
	mapId?: string | undefined;
	apiSourceUrl?: string | undefined;
	apiPopupUrl?: string | undefined;
	apiDivisionUrl?: string | undefined;
	imageServerUrl?: string | undefined;
	sourceData?: Array<MapSourceItemInput> | undefined;
	popupData?: Array<MapPopupItemInput> | undefined;
	// Big maps fetch the shared index and keep only the rows their scope selects
	scope?: MapScope | undefined;
	// Base URL for demand-fetched popup chunks (e.g. `/api/map/`); paired with version
	apiChunkBaseUrl?: string | undefined;
	// Per-map content hashes that cache-key inline source/popup datasets
	sourceDataKey?: string | undefined;
	popupDataKey?: string | undefined;
	baseMapTheme?: Flavor | undefined;
	center?: [number, number];
	showObjectiveFilter?: boolean | undefined;
	languages?: Array<string> | undefined;
	protomapsApiKey?: string | undefined;
	spritesId?: string | undefined;
	spritesUrl?: string | undefined;
	targetIds?: Array<string> | undefined;
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
