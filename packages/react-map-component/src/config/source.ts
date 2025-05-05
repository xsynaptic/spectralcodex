export const MapSourceIdEnum = {
	PointCollection: 'pointCollection',
	MultiPointCollection: 'multiPointCollection',
	LineStringCollection: 'lineStringCollection',
} as const;

export type MapSourceId = (typeof MapSourceIdEnum)[keyof typeof MapSourceIdEnum];
