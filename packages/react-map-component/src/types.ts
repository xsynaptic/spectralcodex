import type { Flavor } from '@protomaps/basemaps';
import type {
	MapPopupItemCompressed,
	MapSourceItemCompressed,
	MapSourceItem,
} from '@spectralcodex/map-codec';
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { MapOptions } from 'maplibre-gl';
import type { CSSProperties } from 'react';
import type { MapProps } from 'react-map-gl/maplibre';

export type MapInitialViewState = MapProps['initialViewState'];

// Supported geometry for use with this component
export type MapGeometry = Point | LineString | Polygon;

export type MapSourceFeatureCollection = FeatureCollection<
	MapGeometry,
	MapSourceItem['properties']
>;

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
	sourceData?: Array<MapSourceItemCompressed> | undefined;
	popupData?: Array<MapPopupItemCompressed> | undefined;
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
