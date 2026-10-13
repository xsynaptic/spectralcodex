import type { MapComponentProps, MapGeometry } from '@spectralcodex/react-map-component';
import type { LocationCategoryEnum, LocationStatus } from '@spectralcodex/shared/map';
import type { FeatureCollection } from 'geojson';

import type { ImageThumbnail } from '#lib/schemas/index.ts';

// Route params for `/api/map/[...id].json`
export const MapApiDataEnum = {
	Popup: 'p',
	Source: 's',
} as const;

export interface MapComponentData {
	featureCount: number;
	hasGeodata: boolean;
	prefetchUrls?: Array<string> | undefined;
	props: MapComponentProps;
}

export type MapFeatureCollection = FeatureCollection<MapGeometry, MapFeatureProperties>;

export interface MapFeatureProperties {
	category: (typeof LocationCategoryEnum)[keyof typeof LocationCategoryEnum];
	description?: string | undefined;
	googleMapsUrl?: string | undefined;
	image?: ImageThumbnail | undefined;
	objective?: number | undefined;
	outlier?: boolean | undefined;
	own?: number | undefined;
	precision: number;
	rating: number;
	status: LocationStatus;
	title: string;
	titleMultilingualLang?: string | undefined;
	titleMultilingualValue?: string | undefined;
	url?: string | undefined;
	wikipediaUrl?: string | undefined;
}
