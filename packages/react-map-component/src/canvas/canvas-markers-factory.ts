import type { MapSourceItem } from '@spectralcodex/map-codec';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';

export interface TargetPoint {
	coordinates: [number, number];
	id: string;
}

interface ScreenPoint {
	x: number;
	y: number;
}

// A Point can sit up to four cluster radii from its cluster's centre, and the map draws at up to twice the clustered scale
export function getClusterSearchRadius(clusterRadius: number) {
	return clusterRadius * 4 * 2;
}

// Closest first, since the closest cluster is usually the one the Point is in
export function getClusterCandidates<Cluster extends ScreenPoint>(
	point: ScreenPoint,
	clusters: ReadonlyArray<Cluster>,
	radiusPx: number,
): Array<Cluster> {
	return clusters
		.map((cluster) => ({
			cluster,
			distance: Math.hypot(cluster.x - point.x, cluster.y - point.y),
		}))
		.filter(({ distance }) => distance <= radiusPx)
		.toSorted((previous, next) => previous.distance - next.distance)
		.map(({ cluster }) => cluster);
}

export function getTargetPoints(
	items: ReadonlyArray<MapSourceItem>,
	targetIds: ReadonlyArray<string>,
): Array<TargetPoint> {
	const targetIdSet = new Set(targetIds);
	const points: Array<TargetPoint> = [];

	for (const { geometry, properties } of items) {
		if (geometry.type !== GeometryTypeEnum.Point || !targetIdSet.has(properties.id)) continue;

		points.push({ coordinates: geometry.coordinates as [number, number], id: properties.id });
	}

	return points;
}
