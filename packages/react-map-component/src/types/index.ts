import type { Flavor } from '@protomaps/basemaps';
import type { FeatureCollection, LineString, Point } from 'geojson';
import type { LngLat, LngLatBoundsLike } from 'maplibre-gl';

import { z } from 'zod';

import type { MapPopupItemSchema, MapSourceItemSchema } from './map-schemas';

// Supported geometry for use with this component
export type MapGeometry = Point | LineString;

/**
 * Map source data
 */
export type MapSourceItemInput = z.input<typeof MapSourceItemSchema>;

export type MapSourceItem = z.output<typeof MapSourceItemSchema>;

export type MapSourceItemExtended = MapSourceItem & {
	properties: MapSourceItem['properties'] & {
		selected?: boolean;
	};
};

export type MapSourceFeatureCollection = FeatureCollection<
	MapGeometry,
	MapSourceItem['properties']
>;

/**
 * Map popup data
 */
export type MapPopupItemInput = z.input<typeof MapPopupItemSchema>;

export type MapPopupItem = z.output<typeof MapPopupItemSchema>;

export type MapPopupItemExtended = MapPopupItem & {
	precision: MapSourceItem['properties']['precision'];
	popupCoordinates: LngLat;
};

/**
 * Map component props
 */
export interface MapComponentProps {
	apiSourceUrl?: string | undefined;
	apiPopupUrl?: string | undefined;
	sourceData?: Array<MapSourceItemInput> | undefined;
	popupData?: Array<MapPopupItemInput> | undefined;
	baseMapTheme?: Flavor | undefined;
	bounds?: LngLatBoundsLike;
	maxBounds?: LngLatBoundsLike;
	center?: [number, number];
	cluster?: boolean | undefined;
	hash?: boolean;
	interactive?: boolean;
	zoom?: number | undefined;
	showObjectiveFilter?: boolean | undefined;
	languages?: Array<string> | undefined;
	protomapsApiKey: string;
	spritesId?: string | undefined;
	spritesUrl?: string | undefined;
	isDev?: boolean | undefined;
}

// Used within Astro to determine whether a map should be rendered
export interface MapComponentData extends MapComponentProps {
	hasGeodata: boolean;
	featureCount: number;
	prefetchUrls?: Array<string> | undefined;
}
