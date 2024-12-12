import type { MapGeometry } from '@/lib/map/map-types';
import type { Feature, FeatureCollection } from 'geojson';
import type { LngLatBoundsLike } from 'maplibre-gl';

export const isGeojsonFeature = <T extends MapGeometry, P>(
	input: Feature<T, P> | FeatureCollection | undefined,
): input is Feature<T, P> => !!input && input.type === 'Feature';

// GeoJSON bounding boxes can have 6 items in the array; MapLibre only supports 4
export const isLngLatBoundsLike = (input: unknown): input is LngLatBoundsLike =>
	!!input &&
	Array.isArray(input) &&
	input.length === 4 &&
	input.every((item) => typeof item === 'number');
