export const MapLayerIdEnum = {
	Clusters: 'clusters',
	ClustersLabel: 'clusters-label',
	ClustersLabelHover: 'clusters-label-hover',
	DivisionHalo: 'division-halo',
	DivisionMask: 'division-mask',
	DivisionOutline: 'division-outline',
	LineString: 'line-string',
	Points: 'points',
	PointsImage: 'points-image',
	PointsLabel: 'points-label',
	PointsTarget: 'points-target',
	Polygon: 'polygon',
	PolygonOutline: 'polygon-outline',
	TargetsLabel: 'targets-label',
} as const satisfies Record<string, string>;

export const MapSourceIdEnum = {
	DivisionCollection: 'divisionCollection',
	HoverCollection: 'hoverCollection',
	LineStringCollection: 'lineStringCollection',
	PointCollection: 'pointCollection',
	PolygonCollection: 'polygonCollection',
} as const;

// Layers react-map-gl hit-tests for pointer events
export const mapInteractiveLayerIds = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.PointsTarget,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsImage,
] as const;

// How much space to provide for clusters; lower number = higher density
export const pointClusterRadius = 13;
