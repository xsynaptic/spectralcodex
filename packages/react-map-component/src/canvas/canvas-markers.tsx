import type { LocationStatus } from '@spectralcodex/shared/map';
import type { GeoJSONSource, MapGeoJSONFeature } from 'maplibre-gl';
import type { FC } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

import { LocationStatusRecords, tailwindColors } from '@spectralcodex/shared/map';
import { useEffect, useMemo, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';

import type { TargetPoint } from '#canvas/canvas-markers-factory.ts';

import {
	getClusterCandidates,
	getClusterSearchRadius,
	getTargetPoints,
} from '#canvas/canvas-markers-factory.ts';
import { useSourceDataQuery } from '#data/data-source.tsx';
import { useIsDarkMode } from '#lib/dark-mode.tsx';
import { MapLayerIdEnum, MapSourceIdEnum, pointClusterRadius } from '#source/source-config.ts';
import { useIsMapPopupVisible, useMapSelectedId } from '#store/store.ts';

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

function areMarkersEqual(previous: TargetMarker, next: TargetMarker): boolean {
	return (
		previous.id === next.id &&
		previous.longitude === next.longitude &&
		previous.latitude === next.latitude &&
		previous.color === next.color
	);
}

function collectClusterMarkers(map: MapRef, color: string): Array<TargetMarker> {
	if (!map.getLayer(MapLayerIdEnum.Clusters)) return [];

	const clusters = map.queryRenderedFeatures(undefined, {
		filter: ['>', ['get', 'hasTarget'], 0],
		layers: [MapLayerIdEnum.Clusters],
	});

	const markers: Array<TargetMarker> = [];

	for (const feature of clusters) {
		if (feature.geometry.type !== 'Point') continue;

		const clusterId =
			typeof feature.properties.cluster_id === 'number' ? feature.properties.cluster_id : undefined;

		if (clusterId === undefined) continue;

		const [longitude, latitude] = feature.geometry.coordinates as [number, number];

		markers.push({
			color,
			id: `cluster-${String(clusterId)}`,
			latitude,
			longitude,
		});
	}

	return markers;
}

function getRenderedClusters(map: MapRef): Array<RenderedCluster> {
	const clusters = new Map<number, RenderedCluster>();
	const features = map.queryRenderedFeatures(undefined, { layers: [MapLayerIdEnum.Clusters] });

	for (const feature of features) {
		const { cluster_id: id, point_count: pointCount } = feature.properties;

		if (feature.geometry.type !== 'Point') continue;
		if (typeof id !== 'number' || typeof pointCount !== 'number') continue;

		const [longitude, latitude] = feature.geometry.coordinates as [number, number];
		const { x, y } = map.project([longitude, latitude]);

		clusters.set(id, { id, latitude, longitude, pointCount, x, y });
	}

	return [...clusters.values()];
}

async function getLeafIds(source: GeoJSONSource, { id, pointCount }: RenderedCluster) {
	const leaves = await source.getClusterLeaves(id, pointCount, 0);

	return new Set(leaves.map((leaf) => leaf.properties?.id as unknown));
}

// Cluster properties are fixed when the source is created, but the atlas map's Targets change with every page, so ask each nearby cluster what it contains
async function collectLeafClusterMarkers({
	color,
	isCurrent,
	leafIds,
	map,
	targets,
}: {
	color: string;
	isCurrent: () => boolean;
	leafIds: Map<number, Set<unknown>>;
	map: MapRef;
	targets: Array<TargetPoint>;
}): Promise<Array<TargetMarker>> {
	const source = map.getSource<GeoJSONSource>(MapSourceIdEnum.PointCollection);

	if (!source || targets.length === 0 || !map.getLayer(MapLayerIdEnum.Clusters)) return [];

	const renderedClusters = getRenderedClusters(map);
	const searchRadius = getClusterSearchRadius(pointClusterRadius);
	const markers = new Map<number, TargetMarker>();

	let pending = targets.map(({ coordinates, id }) => ({
		candidates: getClusterCandidates(map.project(coordinates), renderedClusters, searchRadius),
		id,
	}));

	try {
		// Check every Target's closest cluster in parallel, then move on to the next closest for any that were not in it
		while (pending.length > 0 && isCurrent()) {
			const round = new Map(
				pending
					.flatMap(({ candidates }) => candidates.slice(0, 1))
					.filter((cluster) => !leafIds.has(cluster.id))
					.map((cluster) => [cluster.id, cluster]),
			);

			await Promise.all(
				[...round.values()].map(async (cluster) => {
					leafIds.set(cluster.id, await getLeafIds(source, cluster));
				}),
			);

			pending = pending.filter(({ candidates, id }) => {
				const cluster = candidates.shift();

				if (!cluster) return false;
				if (!leafIds.get(cluster.id)?.has(id)) return true;

				markers.set(cluster.id, {
					color,
					id: `cluster-${String(cluster.id)}`,
					latitude: cluster.latitude,
					longitude: cluster.longitude,
				});

				return false;
			});
		}
	} catch {
		// The clusters changed while we were asking; the next `sourcedata` refresh will try again
	}

	return [...markers.values()];
}

function collectPointMarkers(
	map: MapRef,
	targetIds: Array<string>,
	isDark: boolean,
): Array<TargetMarker> {
	if (!map.getLayer(MapLayerIdEnum.Points)) return [];

	const points = map.queryRenderedFeatures(undefined, {
		filter: ['in', ['get', 'id'], ['literal', targetIds]],
		layers: [MapLayerIdEnum.Points],
	});

	const markers: Array<TargetMarker> = [];

	for (const feature of points) {
		const pointId = typeof feature.properties.id === 'string' ? feature.properties.id : undefined;

		if (!pointId) continue;

		const marker = toPointMarker(feature, pointId, isDark);

		if (marker) markers.push(marker);
	}

	return markers;
}

function getMarkerColor(feature: MapGeoJSONFeature, isDark: boolean): string {
	const status = feature.properties.status as LocationStatus | undefined;

	if (status) {
		const record = LocationStatusRecords[status];

		return isDark ? record.colorDark : record.color;
	}
	return isDark ? tailwindColors.sky400 : tailwindColors.sky500;
}

function toPointMarker(
	feature: MapGeoJSONFeature,
	id: string,
	isDark: boolean,
): TargetMarker | undefined {
	if (feature.geometry.type !== 'Point') return undefined;

	const [longitude, latitude] = feature.geometry.coordinates as [number, number];

	return { color: getMarkerColor(feature, isDark), id, latitude, longitude };
}

function useTargetMarkers(targetIds: Array<string>, isHosted: boolean): Array<TargetMarker> {
	const { current: map } = useMap();
	const { data: sourceData } = useSourceDataQuery();

	const isDark = useIsDarkMode();

	const [markers, setMarkers] = useState<Array<TargetMarker>>([]);
	const [visible, setVisible] = useState(true);

	const targetPoints = useMemo(
		() => (isHosted && sourceData ? getTargetPoints(sourceData, targetIds) : []),
		[isHosted, sourceData, targetIds],
	);

	useEffect(() => {
		if (!map || targetIds.length === 0) return;

		const clusterColor = isDark ? tailwindColors.sky400 : tailwindColors.sky500;

		// Cluster lookups are async, so a refresh checks it is still the latest before it applies its result
		let refreshCount = 0;
		// Rings hidden for a zoom come back with the first refresh that finishes after `moveend`
		let isRevealing = false;
		let leafIds = new Map<number, Set<unknown>>();

		function hideMarkers() {
			refreshCount += 1;
			isRevealing = false;
			setVisible(false);
		}

		async function refreshMarkers() {
			if (!map) return;

			refreshCount += 1;

			const refreshIndex = refreshCount;
			const pointMarkers = collectPointMarkers(map, targetIds, isDark);
			const pointIds = new Set(pointMarkers.map((marker) => marker.id));

			const clusterMarkers = isHosted
				? await collectLeafClusterMarkers({
						color: clusterColor,
						isCurrent: () => refreshIndex === refreshCount,
						leafIds,
						map,
						targets: targetPoints.filter((target) => !pointIds.has(target.id)),
					})
				: collectClusterMarkers(map, clusterColor);

			if (refreshIndex !== refreshCount) return;

			// Keyed by feature id; queryRenderedFeatures repeats a feature once per tile it renders in
			const results = new Map<string, TargetMarker>();

			for (const marker of [...pointMarkers, ...clusterMarkers]) {
				results.set(marker.id, marker);
			}

			const nextMarkers = [...results.values()];

			setMarkers((previous) => {
				if (previous.length !== nextMarkers.length) return nextMarkers;

				for (const [index, current] of nextMarkers.entries()) {
					const before = previous[index];

					if (!before || !areMarkersEqual(before, current)) return nextMarkers;
				}

				return previous;
			});

			if (isRevealing) setVisible(true);
		}

		function onMoveEnd() {
			isRevealing = true;
			void refreshMarkers();
		}

		let refreshFrame: number | undefined;

		// Position refresh only; revealing after a zoom is moveend's job
		function onSourceData(event: {
			isSourceLoaded: boolean;
			sourceDataType?: string;
			sourceId: string;
		}) {
			if (event.sourceId !== MapSourceIdEnum.PointCollection) return;
			if (event.sourceDataType === 'content') leafIds = new Map();
			if (refreshFrame !== undefined || !event.isSourceLoaded) return;

			refreshFrame = requestAnimationFrame(() => {
				refreshFrame = undefined;
				void refreshMarkers();
			});
		}

		map.on('zoomstart', hideMarkers);
		map.on('moveend', onMoveEnd);
		map.on('sourcedata', onSourceData);

		void refreshMarkers();

		return () => {
			refreshCount += 1;

			map.off('zoomstart', hideMarkers);
			map.off('moveend', onMoveEnd);
			map.off('sourcedata', onSourceData);

			if (refreshFrame !== undefined) cancelAnimationFrame(refreshFrame);
		};
	}, [map, targetIds, targetPoints, isDark, isHosted]);

	if (!visible) return [];

	return markers;
}

const MapPulseRing: FC<TargetMarker> = function MapPulseRing({ color, latitude, longitude }) {
	return (
		<Marker anchor="center" latitude={latitude} longitude={longitude}>
			<div className="map-pulse-ring-frame">
				<span className="map-pulse-ring" style={{ borderColor: color }} />
			</div>
		</Marker>
	);
};

export const MapTargetMarkers: FC<{
	isHosted: boolean;
	targetIds: Array<string>;
}> = function MapTargetMarkers({ isHosted, targetIds }) {
	const markers = useTargetMarkers(targetIds, isHosted);

	if (markers.length === 0) return;

	return markers.map((marker) => <MapPulseRing key={marker.id} {...marker} />);
};

function findPointMarker(map: MapRef, id: string, isDark: boolean): TargetMarker | undefined {
	if (!map.getLayer(MapLayerIdEnum.Points)) return undefined;

	const [feature] = map.queryRenderedFeatures(undefined, {
		filter: ['==', ['get', 'id'], id],
		layers: [MapLayerIdEnum.Points],
	});

	return feature ? toPointMarker(feature, id, isDark) : undefined;
}

function useSelectedMarker(targetIds: Array<string> | undefined): TargetMarker | undefined {
	const { current: map } = useMap();
	const isDark = useIsDarkMode();
	const selectedId = useMapSelectedId();
	const isPopupVisible = useIsMapPopupVisible();

	const trackedId =
		isPopupVisible && selectedId && !targetIds?.includes(selectedId) ? selectedId : undefined;

	const [marker, setMarker] = useState<TargetMarker | undefined>();

	useEffect(() => {
		if (!map || !trackedId) return;

		const updateMarker = () => {
			const next = findPointMarker(map, trackedId, isDark);

			setMarker((previous) =>
				previous && next && areMarkersEqual(previous, next) ? previous : next,
			);
		};

		map.on('moveend', updateMarker);

		updateMarker();

		return () => {
			map.off('moveend', updateMarker);
		};
	}, [map, trackedId, isDark]);

	return marker?.id === trackedId ? marker : undefined;
}

export const MapSelectedMarker: FC<{ targetIds?: Array<string> | undefined }> =
	function MapSelectedMarker({ targetIds }) {
		const marker = useSelectedMarker(targetIds);

		if (!marker) return;

		return (
			<MapPulseRing
				key={`selected-${String(marker.longitude)}-${String(marker.latitude)}`}
				{...marker}
			/>
		);
	};
