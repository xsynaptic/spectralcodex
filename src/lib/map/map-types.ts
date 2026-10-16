import type { MapComponentProps } from '@spectralcodex/react-map-component';

export type MapComponentData =
	| { hasGeodata: false; prefetchUrls?: never; props?: never }
	| { hasGeodata: true; prefetchUrls: Array<string>; props: MapComponentProps };
