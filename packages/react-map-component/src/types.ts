import type { Flavor } from '@protomaps/basemaps';
import type {
	MapPopupItemCompressed,
	MapSourceItem,
	MapSourceItemCompressed,
} from '@spectralcodex/map-codec';
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type { MapOptions } from 'maplibre-gl';
import type { CSSProperties } from 'react';
import type { MapProps } from 'react-map-gl/maplibre';

import type { MapDarkModeOptions } from '#lib/dark-mode.tsx';
import type { MapMessages } from '#lib/messages.tsx';

// Used within Astro to determine whether a map should be rendered
export interface MapComponentData extends MapComponentProps {
	featureCount: number;
	hasGeodata: boolean;
	prefetchUrls?: Array<string> | undefined;
}

export interface MapComponentProps extends Partial<
	Pick<MapOptions, 'bounds' | 'hash' | 'interactive' | 'maxBounds' | 'zoom'>
> {
	// Base URL for demand-fetched popup chunks (e.g. `/api/map/`); paired with version
	apiChunkBaseUrl?: string | undefined;
	apiDivisionUrl?: string | undefined;
	apiPopupUrl?: string | undefined;
	apiSourceUrl?: string | undefined;
	baseMapTheme?: Flavor | undefined;
	center?: [number, number];
	// Adapter for a host dark-mode convention; defaults to data-mode="dark" + a mode-changed event
	darkMode?: MapDarkModeOptions | undefined;
	enterMediaQuery?: string | undefined;
	host?: MapHostOptions | undefined;
	imageServerUrl?: string | undefined;
	isDev?: boolean | undefined;
	isObjectiveFilterEnabled?: boolean | undefined;
	languages?: Array<string> | undefined;
	mapFeaturesRule?: MapFeaturesRule | undefined;
	mapId?: string | undefined;
	// Host-overridable UI strings; merged over English defaults
	messages?: Partial<MapMessages> | undefined;
	popupData?: Array<MapPopupItemCompressed> | undefined;
	popupDataKey?: string | undefined;
	protomapsApiKey?: string | undefined;
	sourceData?: Array<MapSourceItemCompressed> | undefined;
	// Per-map content hashes that cache-key inline source/popup datasets
	sourceDataKey?: string | undefined;
	style?: CSSProperties | undefined;
	targetIds?: Array<string> | undefined;
	version?: string | undefined;
}

export type MapGeometry = LineString | Point | Polygon;

// Serializable; a persisted island never receives new props and a function cannot cross island serialization
export interface MapHostOptions {
	// While this matches a click hands the Feature to the host in place of its popup
	featureOpenMediaQuery: string;
	fullscreenContainerId: string;
}

export type MapInitialViewState = MapProps['initialViewState'];

/**
 * Selects Features from the shared global directory
 * - region: keep points whose region ordinal falls inside the subtree interval
 * - theme: keep points carrying the theme index
 * - ids: keep the explicit, order-preserving feature-id list
 */
export type MapFeaturesRule =
	| { ids: Array<string>; type: 'ids' }
	| { index: number; type: 'theme' }
	| { interval: [number, number]; type: 'region' };

export interface MapFeatureOpenDetail {
	url: string;
}

export interface MapTrackDetail {
	data?: Record<string, unknown>;
	name: string;
}

export interface MapScope extends Pick<MapComponentProps, 'apiDivisionUrl' | 'bounds'> {
	rule: MapFeaturesRule;
	title: string;
	url: string;
}

// A Location page sets `targetIds`, a Region or Theme page sets `scope`, any other page sets neither
export interface MapView extends Pick<MapComponentProps, 'targetIds'> {
	scope?: MapScope | undefined;
}

export type MapSourceFeatureCollection = FeatureCollection<
	MapGeometry,
	MapSourceItem['properties']
>;
