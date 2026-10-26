import type { MapSourceItem } from '@spectralcodex/map-codec';

export interface PositionedPoint {
	coordinates: [number, number];
	id: string;
}

export type DisplayedPosition =
	| { clusterId: number; coordinates: [number, number]; kind: 'cluster' }
	| { coordinates: [number, number]; kind: 'point' };

export function getPositionedPoint({ geometry, properties }: MapSourceItem): PositionedPoint {
	return { coordinates: geometry.coordinates, id: properties.id };
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

export async function findPointClusters<Cluster extends { id: number }>(
	pending: ReadonlyArray<{ candidates: ReadonlyArray<Cluster>; id: string }>,
	getLeafIds: (cluster: Cluster) => Promise<Set<unknown>>,
): Promise<Map<string, Cluster>> {
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

				if (leafIds.has(id)) return [id, cluster] as const;
			}

			return;
		}),
	);

	const found = new Map<string, Cluster>();

	for (const result of results) {
		if (result.status === 'fulfilled' && result.value) found.set(...result.value);
	}

	return found;
}
