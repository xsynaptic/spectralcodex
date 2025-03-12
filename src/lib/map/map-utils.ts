import type { Position } from 'geojson';

import { MAP_GEOMETRY_COORDINATES_PRECISION } from '#constants.ts';

export const getTruncatedLngLat = (coordinates: Position): [number, number] => [
	Number(coordinates[0]?.toFixed(MAP_GEOMETRY_COORDINATES_PRECISION) ?? 0),
	Number(coordinates[1]?.toFixed(MAP_GEOMETRY_COORDINATES_PRECISION) ?? 0),
];
