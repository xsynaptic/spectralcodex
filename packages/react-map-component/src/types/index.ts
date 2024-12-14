import { z } from 'zod';

import type { MapPopupDataSchema, MapSourceDataSchema } from './map-schemas';
import type { FeatureCollection, LineString, MultiPoint, Point } from 'geojson';
import type { LngLatBoundsLike } from 'maplibre-gl';

// Supported geometry for use with this component
export type MapGeometry = Point | MultiPoint | LineString;

/**
 * Map canvas data
 */
export type MapSourceDataRaw = z.input<typeof MapSourceDataSchema>;

export type MapSourceData = z.output<typeof MapSourceDataSchema>;

export type MapSourceItem = z.output<typeof MapSourceDataSchema>[number];

export type MapSourceFeatureCollection = FeatureCollection<
	MapGeometry,
	MapSourceItem['properties']
>;

/**
 * Map popup data
 */
export type MapPopupDataRaw = z.input<typeof MapPopupDataSchema>;

export type MapPopupData = z.output<typeof MapPopupDataSchema>;

export type MapPopupItem = MapPopupData[number] & {
	precision: MapSourceItem['properties']['precision'];
	geometry: MapSourceItem['geometry'];
};

/**
 * Protomaps
 */
export type ProtomapsBaseMapTheme = 'light' | 'dark' | 'white' | 'grayscale' | 'black';

/**
 * Map component
 */
export interface MapComponentProps {
	apiSourceUrl?: string | undefined;
	apiPopupUrl?: string | undefined;
	sourceData?: MapSourceDataRaw | undefined;
	popupData?: MapPopupDataRaw | undefined;
	baseMapTheme?: ProtomapsBaseMapTheme;
	bounds?: LngLatBoundsLike;
	maxBounds?: LngLatBoundsLike;
	center?: [number, number];
	cluster?: boolean | undefined;
	hash?: boolean;
	interactive?: boolean;
	zoom?: number | undefined;
	showObjectiveFilter?: boolean | undefined;
	languages?: string[] | undefined;
	protomapsApiKey: string;
	buildId?: string | undefined;
	isDev?: boolean | undefined;
}

// Used within Astro to determine whether a map should be rendered
export interface MapComponentData extends MapComponentProps {
	hasGeodata: boolean;
	featureCount: number;
	prefetchUrls?: string[] | undefined;
}
