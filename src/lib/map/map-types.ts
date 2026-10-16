import type { MapFeatureProperties, MapSourceItem } from '@spectralcodex/map-codec';
import type { MapComponentProps } from '@spectralcodex/react-map-component';
import type { FeatureCollection } from 'geojson';

export type MapComponentData =
	| { hasGeodata: false; prefetchUrls?: never; props?: never }
	| { hasGeodata: true; prefetchUrls: Array<string>; props: MapComponentProps };

export type MapFeatureCollection = FeatureCollection<
	MapSourceItem['geometry'],
	MapFeatureProperties
>;
