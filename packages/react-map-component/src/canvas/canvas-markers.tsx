import type { LocationStatus } from '@spectralcodex/shared/map';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { FC } from 'react';

import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';

import { useDarkMode } from '../lib/dark-mode';
import { LocationStatusRecords } from '../lib/location-status';
import { tailwindColors } from '../lib/tailwind-colors';
import { MapLayerIdEnum, MapSourceIdEnum } from '../source/source-config';
import { useMapPopupVisible, useMapSelectedId } from '../store/store';

interface TargetMarker {
	longitude: number;
	latitude: number;
	color: string;
}

function markersEqual(previous: TargetMarker, next: TargetMarker): boolean {
	return (
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

		function updateMarkers() {
			if (!map) return;

			const results: Array<TargetMarker> = [];

			// Check for unclustered target points
			if (map.getLayer(MapLayerIdEnum.Points)) {
				const points = map.queryRenderedFeatures(undefined, {
					layers: [MapLayerIdEnum.Points],
					filter: ['in', ['get', 'id'], ['literal', targetIds]],
				});

				for (const feature of points) {
					if (feature.geometry.type !== 'Point') continue;

					const [lng, lat] = feature.geometry.coordinates as [number, number];

					results.push({ longitude: lng, latitude: lat, color: getMarkerColor(feature, isDark) });
				}
			}

			// Check for clusters containing target points
			if (map.getLayer(MapLayerIdEnum.Clusters)) {
				const clusters = map.queryRenderedFeatures(undefined, {
					layers: [MapLayerIdEnum.Clusters],
					filter: ['>', ['get', 'hasTarget'], 0],
				});

				for (const feature of clusters) {
					if (feature.geometry.type !== 'Point') continue;

					const [lng, lat] = feature.geometry.coordinates as [number, number];

					results.push({ longitude: lng, latitude: lat, color: clusterColor });
				}
			}

			setMarkers((previous) => {
				if (previous.length !== results.length) return results;

				for (const [index, current] of results.entries()) {
					const before = previous[index];

					if (!before || !markersEqual(before, current)) return results;
				}

				return previous;
			});
			setVisible(true);
		}

		function onSourceData(event: { sourceId: string }) {
			if (event.sourceId === MapSourceIdEnum.PointCollection) updateMarkers();
		}

		map.on('zoomstart', hideMarkers);
		map.on('moveend', updateMarkers);
		map.on('sourcedata', onSourceData);

		updateMarkers();

		return () => {
			map.off('zoomstart', hideMarkers);
			map.off('moveend', updateMarkers);
			map.off('sourcedata', onSourceData);
		};
	}, [map, targetIds, isDark]);

	if (!visible) return [];

	return markers;
}

const MapPulseRing: FC<TargetMarker> = function MapPulseRing({ longitude, latitude, color }) {
	return (
		<Marker longitude={longitude} latitude={latitude} anchor="center">
			<div className="pointer-events-none relative flex items-center justify-center">
				<span
					className="h-8 w-8 rounded-full border-2"
					style={{
						borderColor: color,
						animation: 'target-pulse-ring 2s ease-out infinite',
					}}
				/>
			</div>
		</Marker>
	);
};

export const MapTargetMarkers: FC<{
	targetIds: Array<string>;
}> = function MapTargetMarkers({ targetIds }) {
	const markers = useTargetMarkers(targetIds);

	if (markers.length === 0) return;

	return markers.map((marker) => (
		<MapPulseRing
			key={`target-${String(marker.longitude)}-${String(marker.latitude)}`}
			{...marker}
		/>
	));
};

interface SelectedMarkerState extends TargetMarker {
	id: string;
}

function useSelectedMarker(targetIds: Array<string> | undefined): TargetMarker | undefined {
	const { current: map } = useMap();
	const isDark = useDarkMode();
	const selectedId = useMapSelectedId();
	const popupVisible = useMapPopupVisible();

	const isAlreadyTarget = selectedId !== undefined && targetIds?.includes(selectedId);
	const enabled = Boolean(map && selectedId && popupVisible && !isAlreadyTarget);

	const [marker, setMarker] = useState<SelectedMarkerState | undefined>();

	useEffect(() => {
		if (!enabled || !map || !selectedId) return;

		function updateMarker() {
			if (!map || !selectedId) return;

			if (!map.getLayer(MapLayerIdEnum.Points)) return;

			const features = map.queryRenderedFeatures(undefined, {
				layers: [MapLayerIdEnum.Points],
				filter: ['==', ['get', 'id'], selectedId],
			});

			const feature = features[0];

			if (feature?.geometry.type !== 'Point') {
				setMarker(undefined);

				return;
			}

			const [lng, lat] = feature.geometry.coordinates as [number, number];

			const next: SelectedMarkerState = {
				id: selectedId,
				longitude: lng,
				latitude: lat,
				color: getMarkerColor(feature, isDark),
			};

			setMarker((previous) => {
				if (previous?.id === next.id && markersEqual(previous, next)) return previous;

				return next;
			});
		}

		map.on('moveend', updateMarker);

		updateMarker();

		return () => {
			map.off('moveend', updateMarker);
		};
	}, [enabled, map, selectedId, isDark]);

	if (!enabled || marker?.id !== selectedId) return undefined;

	return marker;
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
