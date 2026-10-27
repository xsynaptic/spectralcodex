import type { BackgroundLayerSpecification } from 'maplibre-gl';

export const MapLayerIdEnum = {
	Clusters: 'clusters',
	ClustersLabel: 'clusters-label',
	ConnectionsBand: 'connections-band',
	ConnectionsLine: 'connections-line',
	DivisionHalo: 'division-halo',
	DivisionMask: 'division-mask',
	DivisionOutline: 'division-outline',
	Points: 'points',
	PointsImage: 'points-image',
	PointsTarget: 'points-target',
	TargetsLabel: 'targets-label',
} as const satisfies Record<string, string>;

export const MapSourceIdEnum = {
	ConnectionCollection: 'connectionCollection',
	DivisionCollection: 'divisionCollection',
	PointCollection: 'pointCollection',
} as const;

export const MapSlotIdEnum = {
	Connections: 'slot-connections',
	Divisions: 'slot-divisions',
	Labels: 'slot-labels',
	Points: 'slot-points',
} as const;

export const mapSlotLayers: Array<BackgroundLayerSpecification> = [
	MapSlotIdEnum.Divisions,
	MapSlotIdEnum.Connections,
	MapSlotIdEnum.Points,
	MapSlotIdEnum.Labels,
].map((id) => ({ id, layout: { visibility: 'none' }, type: 'background' }));

export const mapInteractiveLayerIds = [
	MapLayerIdEnum.Clusters,
	MapLayerIdEnum.PointsTarget,
	MapLayerIdEnum.Points,
	MapLayerIdEnum.PointsImage,
] as const;
