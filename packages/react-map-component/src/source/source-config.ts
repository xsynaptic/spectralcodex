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
	DivisionMask: 'division-mask',
	DivisionOutline: 'division-outline',
	DivisionHalo: 'division-halo',
} as const satisfies Record<string, string>;

export const MapSourceIdEnum = {
	PointCollection: 'pointCollection',
	LineStringCollection: 'lineStringCollection',
	PolygonCollection: 'polygonCollection',
	DivisionCollection: 'divisionCollection',
} as const;

// Layers react-map-gl hit-tests for pointer events; PointsImage is conditional and ignored when absent
export const MAP_INTERACTIVE_LAYER_IDS = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.PointsTarget,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsImage,
] as const;

// Always-rendered layers safe for the onMouseMove guard and query; PointsImage is conditional so it is excluded
export const MAP_QUERYABLE_LAYER_IDS = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsTarget,
] as const;
