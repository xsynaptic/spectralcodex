import type { MapGeometry } from '@spectralcodex/react-map-component';
import type { Feature, FeatureCollection } from 'geojson';
import type { LngLatBoundsLike } from 'maplibre-gl';

export function isGeojsonFeature<T extends MapGeometry, P>(
	input: Feature<T, P> | FeatureCollection | undefined,
): input is Feature<T, P> {
	return !!input && input.type === 'Feature';
}

// GeoJSON bounding boxes can have 6 items in the array; MapLibre only supports 4
export function isLngLatBoundsLike(input: unknown): input is LngLatBoundsLike {
	return (
		!!input &&
		Array.isArray(input) &&
		input.length === 4 &&
		input.every((item) => typeof item === 'number')
	);
}
