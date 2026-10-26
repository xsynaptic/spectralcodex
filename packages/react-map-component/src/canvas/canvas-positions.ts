import type { GeoJSONSource } from 'maplibre-gl';
import type { MapRef } from 'react-map-gl/maplibre';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { useEffect, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';

import type { DisplayedPosition, PositionedPoint } from '#canvas/canvas-positions-factory.ts';

import {
	findPointClusters,
	getClusterCandidates,
	getClusterSearchRadius,
} from '#canvas/canvas-positions-factory.ts';
import { MapLayerIdEnum, MapSourceIdEnum, pointClusterRadius } from '#source/source-config.ts';

interface RenderedCluster {
	coordinates: [number, number];
	id: number;
	pointCount: number;
	x: number;
	y: number;
}

function getRenderedClusters(map: MapRef): Array<RenderedCluster> {
	const clusters = new Map<number, RenderedCluster>();
	const features = map.queryRenderedFeatures(undefined, { layers: [MapLayerIdEnum.Clusters] });

	for (const feature of features) {
		const { cluster_id: id, point_count: pointCount } = feature.properties;

		if (feature.geometry.type !== GeometryTypeEnum.Point) continue;
		if (typeof id !== 'number' || typeof pointCount !== 'number') continue;

		const [longitude, latitude] = feature.geometry.coordinates;

		if (longitude === undefined || latitude === undefined) continue;
		const { x, y } = map.project([longitude, latitude]);

		clusters.set(id, { coordinates: [longitude, latitude], id, pointCount, x, y });
	}

	return [...clusters.values()];
}

async function getLeafIds(source: GeoJSONSource, { id, pointCount }: RenderedCluster) {
	const leaves = await source.getClusterLeaves(id, pointCount, 0);

	return new Set(leaves.map((leaf) => leaf.properties?.id as unknown));
}

function getRenderedPointIds(map: MapRef, ids: Array<string>) {
	if (!map.getLayer(MapLayerIdEnum.Points)) return new Set<string>();

	const points = map.queryRenderedFeatures(undefined, {
		filter: ['in', ['get', 'id'], ['literal', ids]],
		layers: [MapLayerIdEnum.Points],
	});

	return new Set(points.map(({ properties }) => properties.id as unknown));
}

// Cluster properties are fixed when the source is created, so ask each nearby cluster which Points it holds
async function getPointClusters(map: MapRef, points: Array<PositionedPoint>) {
	const source = map.getSource<GeoJSONSource>(MapSourceIdEnum.PointCollection);

	if (!source || points.length === 0 || !map.getLayer(MapLayerIdEnum.Clusters)) {
		return new Map<string, RenderedCluster>();
	}

	const renderedClusters = getRenderedClusters(map);
	const searchRadius = getClusterSearchRadius(pointClusterRadius);

	return findPointClusters(
		points.map(({ coordinates, id }) => ({
			candidates: getClusterCandidates(map.project(coordinates), renderedClusters, searchRadius),
			id,
		})),
		(cluster) => getLeafIds(source, cluster),
	);
}

async function getDisplayedPositions(map: MapRef, points: ReadonlyArray<PositionedPoint>) {
	const positions = new Map<string, DisplayedPosition>();
	const renderedIds = getRenderedPointIds(
		map,
		points.map(({ id }) => id),
	);

	for (const { coordinates, id } of points) {
		if (renderedIds.has(id)) positions.set(id, { coordinates, kind: 'point' });
	}

	const clusters = await getPointClusters(
		map,
		points.filter(({ id }) => !renderedIds.has(id)),
	);

	for (const [id, { coordinates, id: clusterId }] of clusters) {
		positions.set(id, { clusterId, coordinates, kind: 'cluster' });
	}

	return positions;
}

// Re-read on the frame after a tile lands or the zoom level changes, since only then does MapLibre draw the new tiles
export function useDisplayedPositions(
	points: ReadonlyArray<PositionedPoint>,
	{ isClearedOnMove }: { isClearedOnMove: boolean },
) {
	const { current: map } = useMap();
	const [positions, setPositions] = useState<Map<string, DisplayedPosition>>();

	useEffect(() => {
		if (!map || points.length === 0) return;

		let isStale = true;
		let latest: object | undefined;
		let zoomLevel = Math.floor(map.getZoom());

		function clearPositions() {
			isStale = true;
			latest = undefined;
			setPositions(undefined);
		}

		function isReady() {
			if (!map?.getSource(MapSourceIdEnum.PointCollection)) return false;
			if (!isClearedOnMove) return true;

			return !map.isMoving() && map.isSourceLoaded(MapSourceIdEnum.PointCollection);
		}

		function refresh() {
			if (!map || !isStale || !isReady()) return;

			const request = {};

			isStale = false;
			latest = request;

			void getDisplayedPositions(map, points).then((next) => {
				if (latest === request) setPositions(next);
			});
		}

		function onMoveStart() {
			if (isClearedOnMove) clearPositions();
		}

		function onMoveEnd() {
			isStale = true;
			refresh();
		}

		// Cached tiles swap in on a new zoom level without firing `sourcedata`
		function onZoom() {
			if (!map || Math.floor(map.getZoom()) === zoomLevel) return;

			zoomLevel = Math.floor(map.getZoom());
			isStale = true;
		}

		function onSourceData({ sourceId }: { sourceId: string }) {
			if (sourceId === MapSourceIdEnum.PointCollection) isStale = true;
		}

		map.on('movestart', onMoveStart);
		map.on('moveend', onMoveEnd);
		map.on('sourcedata', onSourceData);
		map.on('zoom', onZoom);
		map.on('render', refresh);

		refresh();

		return () => {
			map.off('movestart', onMoveStart);
			map.off('moveend', onMoveEnd);
			map.off('sourcedata', onSourceData);
			map.off('zoom', onZoom);
			map.off('render', refresh);

			clearPositions();
		};
	}, [isClearedOnMove, map, points]);

	return positions;
}
