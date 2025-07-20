export const MapSourceIdEnum = {
	PointCollection: 'pointCollection',
	LineStringCollection: 'lineStringCollection',
	PolygonCollection: 'polygonCollection',
	DivisionCollection: 'divisionCollection',
} as const;

export type MapSourceId = (typeof MapSourceIdEnum)[keyof typeof MapSourceIdEnum];
