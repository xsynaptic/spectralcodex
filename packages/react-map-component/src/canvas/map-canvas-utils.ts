import type { GeoJSONSource, Source } from 'maplibre-gl';

export const isMapGeojsonSource = (input?: Source): input is GeoJSONSource =>
	input?.type === 'geojson';

export const isMapCoordinates = (input: unknown): input is [number, number] =>
	!!input &&
	Array.isArray(input) &&
	input.length === 2 &&
	typeof input[0] === 'number' &&
	typeof input[1] === 'number';
