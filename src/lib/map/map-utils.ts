import type { Position } from 'geojson';

import { mapGeometryCoordinatesPrecision } from '#constants.ts';

export const getTruncatedLngLat = (coordinates: Position): [number, number] => [
	Number(coordinates[0]?.toFixed(mapGeometryCoordinatesPrecision) ?? 0),
	Number(coordinates[1]?.toFixed(mapGeometryCoordinatesPrecision) ?? 0),
];
