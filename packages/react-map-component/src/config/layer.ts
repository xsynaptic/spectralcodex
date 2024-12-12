export const mapLayerIds = {
	clusters: 'clusters',
	clustersLabel: 'clusters-label',
	points: 'points',
	pointsTarget: 'points-target',
	multiPoints: 'multi-points',
	multiPointsTarget: 'multi-points-target',
	lineString: 'line-string',
} as const satisfies Record<string, string>;
