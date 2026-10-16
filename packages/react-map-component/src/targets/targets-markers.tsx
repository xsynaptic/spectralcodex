import type { LocationStatus } from '@spectralcodex/shared/map';
import type { GeoJSONSource } from 'maplibre-gl';
import type { FC } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

import { GeometryTypeEnum, LocationStatusRecords, tailwindColors } from '@spectralcodex/shared/map';
import { useEffect, useMemo, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';

import type { TargetPoint } from '#targets/targets-markers-factory.ts';

import { useMapRows } from '#data/data-query.ts';
import { getClusterHoverId } from '#lib/cluster-hover.ts';
import { useIsDarkMode } from '#lib/dark-mode.ts';
import { MapLayerIdEnum, MapSourceIdEnum, pointClusterRadius } from '#source/source-config.ts';
import { selectTargetIds } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';
import {
	findTargetClusters,
	getClusterCandidates,
	getClusterSearchRadius,
	getTargetPoints,
} from '#targets/targets-markers-factory.ts';

interface RenderedCluster {
	id: number;
	latitude: number;
	longitude: number;
	pointCount: number;
	x: number;
	y: number;
}

interface TargetMarker {
	color: string;
	id: string;
	latitude: number;
	longitude: number;
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

		clusters.set(id, { id, latitude, longitude, pointCount, x, y });
	}

	return [...clusters.values()];
}

async function getLeafIds(source: GeoJSONSource, { id, pointCount }: RenderedCluster) {
	const leaves = await source.getClusterLeaves(id, pointCount, 0);

	return new Set(leaves.map((leaf) => leaf.properties?.id as unknown));
}

function getPointColor(status: LocationStatus | undefined, isDark: boolean) {
	if (!status) return isDark ? tailwindColors.sky400 : tailwindColors.sky500;

	const record = LocationStatusRecords[status];

	return isDark ? record.colorDark : record.color;
}

// Keyed by id, since queryRenderedFeatures repeats a feature once per tile it renders in
function getPointMarkers(map: MapRef, targetIds: Array<string>, isDark: boolean) {
	const markers = new Map<string, TargetMarker>();

	if (!map.getLayer(MapLayerIdEnum.Points)) return markers;

	const points = map.queryRenderedFeatures(undefined, {
		filter: ['in', ['get', 'id'], ['literal', targetIds]],
		layers: [MapLayerIdEnum.Points],
	});

	for (const { geometry, properties } of points) {
		if (geometry.type !== GeometryTypeEnum.Point || typeof properties.id !== 'string') continue;

		const [longitude, latitude] = geometry.coordinates;

		if (longitude === undefined || latitude === undefined) continue;
		const color = getPointColor(properties.status as LocationStatus | undefined, isDark);

		markers.set(properties.id, { color, id: properties.id, latitude, longitude });
	}

	return markers;
}

// Cluster properties are fixed when the source is created, but Targets change with every page, so ask each nearby cluster what it holds
async function getClusterMarkers(map: MapRef, targets: Array<TargetPoint>, isDark: boolean) {
	const source = map.getSource<GeoJSONSource>(MapSourceIdEnum.PointCollection);

	if (!source || targets.length === 0 || !map.getLayer(MapLayerIdEnum.Clusters)) return [];

	const renderedClusters = getRenderedClusters(map);
	const searchRadius = getClusterSearchRadius(pointClusterRadius);
	const color = isDark ? tailwindColors.sky400 : tailwindColors.sky500;

	const clusters = await findTargetClusters(
		targets.map(({ coordinates, id }) => ({
			candidates: getClusterCandidates(map.project(coordinates), renderedClusters, searchRadius),
			id,
		})),
		(cluster) => getLeafIds(source, cluster),
	);

	return clusters.map(({ id, latitude, longitude }) => ({
		color,
		id: getClusterHoverId(id),
		latitude,
		longitude,
	}));
}

async function getTargetMarkers(map: MapRef, targets: Array<TargetPoint>, isDark: boolean) {
	const pointMarkers = getPointMarkers(
		map,
		targets.map(({ id }) => id),
		isDark,
	);
	const clusterMarkers = await getClusterMarkers(
		map,
		targets.filter(({ id }) => !pointMarkers.has(id)),
		isDark,
	);

	return [...pointMarkers.values(), ...clusterMarkers];
}

function useTargetMarkers() {
	const { current: map } = useMap();
	const { data: sourceData } = useMapRows();
	const targetIds = useMapStore(selectTargetIds);
	const isDark = useIsDarkMode();

	const [markers, setMarkers] = useState<Array<TargetMarker>>([]);

	const targets = useMemo(
		() => (sourceData ? getTargetPoints(sourceData, targetIds) : []),
		[sourceData, targetIds],
	);

	useEffect(() => {
		if (!map || targets.length === 0) return;

		let isStale = true;
		let latest: object | undefined;

		function clearMarkers() {
			isStale = true;
			latest = undefined;
			setMarkers([]);
		}

		function onSourceData({ sourceId }: { sourceId: string }) {
			if (sourceId === MapSourceIdEnum.PointCollection) isStale = true;
		}

		function onIdle() {
			if (!map || !isStale) return;

			const refresh = {};

			isStale = false;
			latest = refresh;

			void getTargetMarkers(map, targets, isDark).then((next) => {
				if (latest === refresh) setMarkers(next);
			});
		}

		map.on('movestart', clearMarkers);
		map.on('sourcedata', onSourceData);
		map.on('idle', onIdle);

		onIdle();

		return () => {
			map.off('movestart', clearMarkers);
			map.off('sourcedata', onSourceData);
			map.off('idle', onIdle);

			clearMarkers();
		};
	}, [isDark, map, targets]);

	return markers;
}

export const MapTargetMarkers: FC = function MapTargetMarkers() {
	const markers = useTargetMarkers();

	return markers.map(({ color, id, latitude, longitude }) => (
		<Marker anchor="center" key={id} latitude={latitude} longitude={longitude}>
			<div className="map-pulse-ring-frame">
				<span className="map-pulse-ring" style={{ borderColor: color }} />
			</div>
		</Marker>
	));
};
