import type { MapSourceItem } from '@spectralcodex/map-codec';

import { selectMapRows } from '@spectralcodex/map-codec';

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
	return selectMapRows(items, { ids: [...targetIds], type: 'ids' }).map(
		({ geometry, properties }) => ({
			coordinates: geometry.coordinates,
			id: properties.id,
		}),
	);
}

export async function findTargetClusters<Cluster extends { id: number }>(
	pending: ReadonlyArray<{ candidates: ReadonlyArray<Cluster>; id: string }>,
	getLeafIds: (cluster: Cluster) => Promise<Set<unknown>>,
): Promise<Array<Cluster>> {
	const leaves = new Map<number, Promise<Set<unknown>>>();

	function getLeaves(cluster: Cluster) {
		const known = leaves.get(cluster.id);

		if (known) return known;

		const asked = getLeafIds(cluster);

		leaves.set(cluster.id, asked);

		return asked;
	}

	const results = await Promise.allSettled(
		pending.map(async ({ candidates, id }) => {
			for (const cluster of candidates) {
				const leafIds = await getLeaves(cluster);

				if (leafIds.has(id)) return cluster;
			}

			return;
		}),
	);

	const found = new Map<number, Cluster>();

	for (const result of results) {
		if (result.status === 'fulfilled' && result.value) found.set(result.value.id, result.value);
	}

	return [...found.values()];
}
