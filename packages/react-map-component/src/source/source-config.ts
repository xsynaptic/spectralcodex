export const MapLayerIdEnum = {
	Clusters: 'clusters',
	ClustersLabel: 'clusters-label',
	ClustersLabelHover: 'clusters-label-hover',
	DivisionHalo: 'division-halo',
	DivisionMask: 'division-mask',
	DivisionOutline: 'division-outline',
	Points: 'points',
	PointsImage: 'points-image',
	PointsLabel: 'points-label',
	PointsTarget: 'points-target',
	TargetsLabel: 'targets-label',
} as const satisfies Record<string, string>;

export const MapSourceIdEnum = {
	DivisionCollection: 'divisionCollection',
	HoverCollection: 'hoverCollection',
	PointCollection: 'pointCollection',
} as const;

export const mapInteractiveLayerIds = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.PointsTarget,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsImage,
] as const;

export const pointClusterRadius = 13;
