export const MapLayerIdEnum = {
	Clusters: 'clusters',
	ClustersLabel: 'clusters-label',
	Points: 'points',
	PointsTarget: 'points-target',
	PointsImage: 'points-image',
	LineString: 'line-string',
} as const satisfies Record<string, string>;

export type MapLayerId = (typeof MapLayerIdEnum)[keyof typeof MapLayerIdEnum];
