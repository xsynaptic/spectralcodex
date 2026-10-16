import type { Flavor } from '@protomaps/basemaps';
import type { MapFeaturesRule, MapScope, MapView } from '@spectralcodex/map-codec';
import type { Feature, Point } from 'geojson';
import type { MapOptions } from 'maplibre-gl';
import type { CSSProperties } from 'react';
import type { MapProps } from 'react-map-gl/maplibre';

import type { defaultMapMessages } from '#constants.ts';

export interface MapComponentProps extends Partial<
	Pick<MapOptions, 'hash' | 'interactive' | 'zoom'>
> {
	apiDivisionUrl?: string | undefined;
	apiSourceUrl: string;
	baseMapTheme?: Flavor | undefined;
	bounds?: MapScope['bounds'] | undefined;
	center?: [number, number];
	controls?: ReadonlyArray<MapHostControlName> | undefined;
	host?: MapHostOptions | undefined;
	imageServerUrl?: string | undefined;
	isDev?: boolean | undefined;
	isObjectiveFilterEnabled?: boolean | undefined;
	languages?: Array<string> | undefined;
	mapFeaturesRule: MapFeaturesRule;
	mapId?: string | undefined;
	maxBounds?: MapScope['bounds'] | undefined;
	messages?: Partial<MapMessages> | undefined;
	protomapsApiKey?: string | undefined;
	style?: CSSProperties | undefined;
	targetIds?: Array<string> | undefined;
}

export type MapClickOutcome =
	| { center: [number, number]; clusterId: number | string; kind: 'expand-cluster' }
	| { isEased: boolean; kind: 'popup'; pointId: string }
	| { isScopeRestored: boolean; kind: 'open'; url: string }
	| { kind: 'clear' }
	| { kind: 'none' };

export type MapHoverCluster = Feature<Point>;

export type MapOverlayClose = 'dismiss' | 'keyboard' | 'pointer';

export type MapHostControlName = 'enter' | 'exit' | 'expand';

export interface MapHost {
	canOpen: boolean;
	controls: ReadonlyArray<MapHostControlName>;
	fullscreenContainerId: string | undefined;
	open: (url: string) => void;
	readView: () => MapStoreView;
	send: (name: MapHostControlName) => void;
}

// Astro serializes island props, so no function crosses here
interface MapHostOptions {
	fullscreenContainerId: string;
}

export type MapInitialViewState = MapProps['initialViewState'];

export type MapMessages = Record<keyof typeof defaultMapMessages, string>;

export type MapTrackName =
	| 'map-error'
	| 'map-filter-open'
	| 'map-load'
	| 'map-popup-open'
	| 'map-popup-visit'
	| 'map-scope-toggle'
	| 'map-search-pick'
	| `map-${MapHostControlName}`;

export interface MapTrackDetail {
	data?: Record<string, unknown>;
	mapId?: string | undefined;
	name: string;
}

export interface MapStoreView {
	view: MapView;
	viewKey: string | undefined;
}

export type { MapFeaturesRule, MapScope, MapView } from '@spectralcodex/map-codec';
