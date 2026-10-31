import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { FeatureCollection, LineString } from 'geojson';

import { getMapRowById, getMapRowUrl } from '@spectralcodex/map-codec';

import type { ClusterPosition, PositionedPoint } from '#lib/clusters-factory.ts';

import { getClusterKey, getPositionedPoint } from '#lib/clusters-factory.ts';
import { getArcCoordinates } from '#source/source-arc-factory.ts';

export interface Connection {
	from: PositionedPoint;
	kind: 'link' | 'points';
	to: PositionedPoint;
}

export type ConnectionCollection = FeatureCollection<LineString, Pick<Connection, 'kind'>>;

function getPairKey(firstId: string, secondId: string) {
	return [firstId, secondId].sort((first, second) => first.localeCompare(second)).join(' ');
}

function getDistance(from: PositionedPoint, to: PositionedPoint) {
	const [fromLongitude, fromLatitude] = from.coordinates;
	const [toLongitude, toLatitude] = to.coordinates;
	const longitudeScale = Math.cos((fromLatitude * Math.PI) / 180);

	return Math.hypot((toLongitude - fromLongitude) * longitudeScale, toLatitude - fromLatitude);
}

function findNearestPair(
	joined: ReadonlyArray<PositionedPoint>,
	remaining: ReadonlyArray<PositionedPoint>,
) {
	let nearest: undefined | { distance: number; from: PositionedPoint; to: PositionedPoint };

	for (const from of joined) {
		for (const to of remaining) {
			const distance = getDistance(from, to);

			if (!nearest || distance < nearest.distance) nearest = { distance, from, to };
		}
	}

	return nearest;
}

// Prim's shortest tree; a star or a full web gets messy on Locations with many Points
function getPointConnections([first, ...rest]: ReadonlyArray<PositionedPoint>) {
	if (!first) return [];

	const joined = [first];
	const remaining = [...rest];
	const connections: Array<Connection> = [];

	while (remaining.length > 0) {
		const nearest = findNearestPair(joined, remaining);

		if (!nearest) break;

		remaining.splice(remaining.indexOf(nearest.to), 1);
		joined.push(nearest.to);
		connections.push({ from: nearest.from, kind: 'points', to: nearest.to });
	}

	return connections;
}

function getLinkConnections(rows: ReadonlyArray<MapSourceItem>, main: PositionedPoint) {
	const connections: Array<Connection> = [];

	for (const row of rows) {
		const { backlinks = [], id } = row.properties;

		for (const backlinkId of backlinks) {
			if (id !== main.id && backlinkId !== main.id) continue;

			const backlink = getMapRowById(rows, backlinkId);

			if (!backlink) continue;

			connections.push({
				from: getPositionedPoint(backlink),
				kind: 'link',
				to: getPositionedPoint(row),
			});
		}
	}

	return connections;
}

// Links meet the subject at its first Point, which is where the build stores them
export function getConnections(
	rows: ReadonlyArray<MapSourceItem>,
	subjectId: string | undefined,
): Array<Connection> {
	if (!subjectId || !getMapRowById(rows, subjectId)) return [];

	const url = getMapRowUrl(subjectId);
	const points = rows
		.filter(({ properties }) => getMapRowUrl(properties.id) === url)
		.map((row) => getPositionedPoint(row))
		.sort((first, second) => first.id.localeCompare(second.id, undefined, { numeric: true }));
	const [main] = points;

	if (!main) return [];

	const connectionByPair = new Map<string, Connection>();

	for (const connection of [...getPointConnections(points), ...getLinkConnections(rows, main)]) {
		const key = getPairKey(connection.from.id, connection.to.id);

		if (!connectionByPair.has(key)) connectionByPair.set(key, connection);
	}

	return [...connectionByPair.values()];
}

export function getConnectionPoints(connections: ReadonlyArray<Connection>) {
	const pointById = new Map<string, PositionedPoint>();

	for (const { from, to } of connections) {
		pointById.set(from.id, from);
		pointById.set(to.id, to);
	}

	return [...pointById.values()];
}

function getDrawnEnd(point: PositionedPoint, cluster: ClusterPosition | undefined) {
	if (cluster) return { coordinates: cluster.coordinates, key: getClusterKey(cluster.clusterId) };

	return { coordinates: point.coordinates, key: point.id };
}

export function getConnectionCollection(
	connections: ReadonlyArray<Connection>,
	clusters: ReadonlyMap<string, ClusterPosition>,
): ConnectionCollection {
	const features: ConnectionCollection['features'] = [];
	const drawnPairs = new Set<string>();

	for (const { from, kind, to } of connections) {
		const fromEnd = getDrawnEnd(from, clusters.get(from.id));
		const toEnd = getDrawnEnd(to, clusters.get(to.id));
		const pairKey = getPairKey(fromEnd.key, toEnd.key);

		if (fromEnd.key === toEnd.key || drawnPairs.has(pairKey)) continue;

		drawnPairs.add(pairKey);
		features.push({
			geometry: {
				coordinates: getArcCoordinates(fromEnd.coordinates, toEnd.coordinates),
				type: 'LineString',
			},
			properties: { kind },
			type: 'Feature',
		});
	}

	return { features, type: 'FeatureCollection' };
}
