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

export async function findTargetClusters<Cluster extends { id: number }>({
	getLeafIds,
	isCurrent,
	leafIds,
	pending,
}: {
	getLeafIds: (cluster: Cluster) => Promise<Set<unknown>>;
	isCurrent: () => boolean;
	leafIds: Map<number, Set<unknown>>;
	pending: ReadonlyArray<{ candidates: ReadonlyArray<Cluster>; id: string }>;
}): Promise<Array<Cluster>> {
	const found = new Map<number, Cluster>();
	let remaining = pending.map(({ candidates, id }) => ({ candidates: [...candidates], id }));

	try {
		while (remaining.length > 0 && isCurrent()) {
			const round = new Map(
				remaining
					.flatMap(({ candidates }) => candidates.slice(0, 1))
					.filter((cluster) => !leafIds.has(cluster.id))
					.map((cluster) => [cluster.id, cluster]),
			);

			await Promise.all(
				[...round.values()].map(async (cluster) => {
					leafIds.set(cluster.id, await getLeafIds(cluster));
				}),
			);

			remaining = remaining.filter(({ candidates, id }) => {
				const cluster = candidates.shift();

				if (!cluster) return false;
				if (!leafIds.get(cluster.id)?.has(id)) return true;

				found.set(cluster.id, cluster);

				return false;
			});
		}
	} catch {
		// The clusters changed while we were asking; the caller's next refresh will try again
	}

	return [...found.values()];
}
