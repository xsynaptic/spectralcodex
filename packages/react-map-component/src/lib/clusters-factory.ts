import type { ClusterOrPointFeature } from '@maplibre/geojson-vt';
import type { MapSourceItem } from '@spectralcodex/map-codec';

import { Supercluster } from '@maplibre/geojson-vt';

export interface PositionedPoint {
	coordinates: [number, number];
	id: string;
}

export interface ClusterPosition {
	clusterId: number;
	coordinates: [number, number];
}

interface ClusterMember {
	coordinates: [number, number];
	id: number | string;
}

interface ClusterWalk {
	member: ClusterMember | undefined;
	pointId: string;
	zoom: number;
}

export const pointClusterOptions = { maxZoom: 14, minPoints: 2, radius: 13 } as const;

export const noClusterPositions: ReadonlyMap<string, ClusterPosition> = new Map();

const indexByRows = new WeakMap<ReadonlyArray<MapSourceItem>, Supercluster>();

const maplibreTileExtent = 8192;
const maplibreTileSizePx = 512;

// A child and its cluster's center both sit within one radius of the seed; the third is margin
const parentReachPx = pointClusterOptions.radius * 3;

// Location ids never hold `#`, so a cluster key cannot collide with a Point id
export function getClusterKey(clusterId: number) {
	return `#${String(clusterId)}`;
}

export function getPositionedPoint({ geometry, properties }: MapSourceItem): PositionedPoint {
	return { coordinates: geometry.coordinates, id: properties.id };
}

// Mirrors the worker's index, which the main thread can only ask about clusters it already knows
export function getClusterIndex(rows: ReadonlyArray<MapSourceItem>) {
	const known = indexByRows.get(rows);

	if (known) return known;

	const index = new Supercluster({
		extent: maplibreTileExtent,
		maxZoom: pointClusterOptions.maxZoom,
		minPoints: pointClusterOptions.minPoints,
		radius: pointClusterOptions.radius * (maplibreTileExtent / maplibreTileSizePx),
	});

	index.load([...rows]);
	indexByRows.set(rows, index);

	return index;
}

function getClusterMember({ geometry, properties }: ClusterOrPointFeature) {
	const [longitude, latitude] = geometry.coordinates;

	if (longitude === undefined || latitude === undefined) return;

	const coordinates: [number, number] = [longitude, latitude];
	const clusterId: unknown = properties?.cluster_id;

	if (typeof clusterId === 'number') return { coordinates, id: clusterId } satisfies ClusterMember;

	const id: unknown = properties?.id;

	if (typeof id !== 'string') return;

	return { coordinates, id } satisfies ClusterMember;
}

function getBox([longitude, latitude]: [number, number], zoom: number, distancePx: number) {
	const degrees = (distancePx / (maplibreTileSizePx * 2 ** zoom)) * 360;

	return [
		longitude - degrees,
		latitude - degrees,
		longitude + degrees,
		latitude + degrees,
	] satisfies [number, number, number, number];
}

function findParent(index: Supercluster, member: ClusterMember, zoom: number) {
	const nearby = index
		.getClusters(getBox(member.coordinates, zoom, parentReachPx), zoom)
		.map((feature) => getClusterMember(feature))
		.filter((candidate) => candidate !== undefined);

	const unmerged = nearby.find(({ id }) => id === member.id);

	if (unmerged) return unmerged;

	return nearby.find(
		({ id }) =>
			typeof id === 'number' &&
			index.getChildren(id).some((child) => getClusterMember(child)?.id === member.id),
	);
}

// Walks up through children, since a low-zoom cluster holds thousands of leaves
export function createClusterLocator(index: Supercluster, points: ReadonlyArray<PositionedPoint>) {
	const positionsByZoom = Array.from(
		{ length: pointClusterOptions.maxZoom + 1 },
		() => new Map<string, ClusterPosition>(),
	);
	const walks: Array<ClusterWalk> = points.map((point) => ({
		member: point,
		pointId: point.id,
		zoom: pointClusterOptions.maxZoom + 1,
	}));

	function walkTo(walk: ClusterWalk, tileZoom: number) {
		while (walk.member && walk.zoom > tileZoom) {
			const parent = findParent(index, walk.member, walk.zoom - 1);

			walk.zoom -= 1;
			walk.member = parent;

			if (parent && typeof parent.id === 'number') {
				positionsByZoom[walk.zoom]?.set(walk.pointId, {
					clusterId: parent.id,
					coordinates: parent.coordinates,
				});
			}
		}
	}

	return function getClusterPositions(tileZoom: number) {
		const positions = positionsByZoom[tileZoom];

		if (!positions) return noClusterPositions;

		for (const walk of walks) walkTo(walk, tileZoom);

		return positions;
	};
}
