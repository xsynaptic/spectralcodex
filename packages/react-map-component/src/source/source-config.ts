export const MapLayerIdEnum = {
	Clusters: 'clusters',
	ClustersLabel: 'clusters-label',
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
} as const satisfies Record<string, string>;

export const MapSourceIdEnum = {
	DivisionCollection: 'divisionCollection',
	LineStringCollection: 'lineStringCollection',
	PointCollection: 'pointCollection',
	PolygonCollection: 'polygonCollection',
} as const;

export const otherFeatureOpacity = 0.5;

// Layers react-map-gl hit-tests for pointer events
export const mapInteractiveLayerIds = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.PointsTarget,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsImage,
] as const;

// Layers for the onMouseMove guard and query; PointsImage always sits inside a Points hit so it is left out
export const mapQueryableLayerIds = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsTarget,
] as const;
