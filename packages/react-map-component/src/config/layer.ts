export const MapLayerIdEnum = {
	Clusters: 'clusters',
	ClustersLabel: 'clusters-label',
	Points: 'points',
	PointsTarget: 'points-target',
	PointsImage: 'points-image',
	PointsLabel: 'points-label',
	LineString: 'line-string',
	Polygon: 'polygon',
	PolygonOutline: 'polygon-outline',
	Division: 'division',
	DivisionOutline: 'division-outline',
} as const satisfies Record<string, string>;

export type MapLayerId = (typeof MapLayerIdEnum)[keyof typeof MapLayerIdEnum];
