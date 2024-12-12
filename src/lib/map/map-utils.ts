import type { Position } from 'geojson';

// Limit precision of coordinate data to save space; may be superseded by Turf's truncate function
const GEOMETRY_COORDINATES_PRECISION = 6;

export const getTruncatedLngLat = (coordinates: Position): [number, number] => [
	Number(coordinates[0]?.toFixed(GEOMETRY_COORDINATES_PRECISION) ?? 0),
	Number(coordinates[1]?.toFixed(GEOMETRY_COORDINATES_PRECISION) ?? 0),
];
