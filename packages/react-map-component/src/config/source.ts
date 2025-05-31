export const MapSourceIdEnum = {
	PointCollection: 'pointCollection',
	LineStringCollection: 'lineStringCollection',
} as const;

export type MapSourceId = (typeof MapSourceIdEnum)[keyof typeof MapSourceIdEnum];
