import type { LocationStatus } from '@spectralcodex/shared/map';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { FC } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';

import { useDarkMode } from '../lib/dark-mode';
import { LocationStatusRecords } from '../lib/location-status';
import { tailwindColors } from '../lib/tailwind-colors';
import { MapLayerIdEnum, MapSourceIdEnum } from '../source/source-config';
import { useMapPopupVisible, useMapSelectedId } from '../store/store';

interface TargetMarker {
	id: string;
	longitude: number;
	latitude: number;
	color: string;
}

function markersEqual(previous: TargetMarker, next: TargetMarker): boolean {
	return (
		previous.id === next.id &&
		previous.longitude === next.longitude &&
		previous.latitude === next.latitude &&
		previous.color === next.color
	);
}

// Handles status-specific colors as well as a cluster fallback
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

	return { id, longitude, latitude, color: getMarkerColor(feature, isDark) };
}

function collectPointMarkers(
	map: MapRef,
	targetIds: Array<string>,
	isDark: boolean,
): Array<TargetMarker> {
	if (!map.getLayer(MapLayerIdEnum.Points)) return [];

	const points = map.queryRenderedFeatures(undefined, {
		layers: [MapLayerIdEnum.Points],
		filter: ['in', ['get', 'id'], ['literal', targetIds]],
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

function collectClusterMarkers(map: MapRef, color: string): Array<TargetMarker> {
	if (!map.getLayer(MapLayerIdEnum.Clusters)) return [];

	const clusters = map.queryRenderedFeatures(undefined, {
		layers: [MapLayerIdEnum.Clusters],
		filter: ['>', ['get', 'hasTarget'], 0],
	});

	const markers: Array<TargetMarker> = [];

	for (const feature of clusters) {
		if (feature.geometry.type !== 'Point') continue;

		const clusterId =
			typeof feature.properties.cluster_id === 'number' ? feature.properties.cluster_id : undefined;

		if (clusterId === undefined) continue;

		const [longitude, latitude] = feature.geometry.coordinates as [number, number];

		markers.push({
			id: `cluster-${String(clusterId)}`,
			longitude,
			latitude,
			color,
		});
	}

	return markers;
}

function useTargetMarkers(targetIds: Array<string>): Array<TargetMarker> {
	const { current: map } = useMap();

	const isDark = useDarkMode();

	const [markers, setMarkers] = useState<Array<TargetMarker>>([]);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		if (!map || targetIds.length === 0) return;

		const clusterColor = isDark ? tailwindColors.sky400 : tailwindColors.sky500;

		function hideMarkers() {
			setVisible(false);
		}

		function refreshMarkers() {
			if (!map) return;

			// Keyed by feature id; queryRenderedFeatures repeats a feature once per tile it renders in
			const results = new Map<string, TargetMarker>();

			for (const marker of [
				...collectPointMarkers(map, targetIds, isDark),
				...collectClusterMarkers(map, clusterColor),
			]) {
				results.set(marker.id, marker);
			}

			const nextMarkers = [...results.values()];

			setMarkers((previous) => {
				if (previous.length !== nextMarkers.length) return nextMarkers;

				for (const [index, current] of nextMarkers.entries()) {
					const before = previous[index];

					if (!before || !markersEqual(before, current)) return nextMarkers;
				}

				return previous;
			});
		}

		function showMarkers() {
			refreshMarkers();
			setVisible(true);
		}

		// Position refresh only; revealing after a zoom is moveend's job
		function onSourceData(event: { sourceId: string; isSourceLoaded: boolean }) {
			if (event.sourceId === MapSourceIdEnum.PointCollection && event.isSourceLoaded) {
				refreshMarkers();
			}
		}

		map.on('zoomstart', hideMarkers);
		map.on('moveend', showMarkers);
		map.on('sourcedata', onSourceData);

		refreshMarkers();

		return () => {
			map.off('zoomstart', hideMarkers);
			map.off('moveend', showMarkers);
			map.off('sourcedata', onSourceData);
		};
	}, [map, targetIds, isDark]);

	if (!visible) return [];

	return markers;
}

const MapPulseRing: FC<TargetMarker> = function MapPulseRing({ longitude, latitude, color }) {
	return (
		<Marker longitude={longitude} latitude={latitude} anchor="center">
			<div className="map-pulse-ring-frame">
				<span className="map-pulse-ring" style={{ borderColor: color }} />
			</div>
		</Marker>
	);
};

export const MapTargetMarkers: FC<{
	targetIds: Array<string>;
}> = function MapTargetMarkers({ targetIds }) {
	const markers = useTargetMarkers(targetIds);

	if (markers.length === 0) return;

	return markers.map((marker) => <MapPulseRing key={marker.id} {...marker} />);
};

function findPointMarker(map: MapRef, id: string, isDark: boolean): TargetMarker | undefined {
	if (!map.getLayer(MapLayerIdEnum.Points)) return undefined;

	const [feature] = map.queryRenderedFeatures(undefined, {
		layers: [MapLayerIdEnum.Points],
		filter: ['==', ['get', 'id'], id],
	});

	return feature ? toPointMarker(feature, id, isDark) : undefined;
}

function useSelectedMarker(targetIds: Array<string> | undefined): TargetMarker | undefined {
	const { current: map } = useMap();
	const isDark = useDarkMode();
	const selectedId = useMapSelectedId();
	const popupVisible = useMapPopupVisible();

	const trackedId =
		popupVisible && selectedId && !targetIds?.includes(selectedId) ? selectedId : undefined;

	const [marker, setMarker] = useState<TargetMarker | undefined>();

	useEffect(() => {
		if (!map || !trackedId) return;

		const updateMarker = () => {
			const next = findPointMarker(map, trackedId, isDark);

			setMarker((previous) => (previous && next && markersEqual(previous, next) ? previous : next));
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
