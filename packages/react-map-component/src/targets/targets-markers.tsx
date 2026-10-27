import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LocationStatus } from '@spectralcodex/shared/map';
import type { FC } from 'react';

import { getMapRowById } from '@spectralcodex/map-codec';
import { LocationStatusRecords, tailwindColors } from '@spectralcodex/shared/map';
import { useMemo, useState } from 'react';
import { Marker } from 'react-map-gl/maplibre';

import type { ClusterPosition, PositionedPoint } from '#lib/clusters-factory.ts';

import { useClusterPositions } from '#canvas/canvas-positions.ts';
import { useMapCanvasData } from '#data/data-canvas.tsx';
import { getClusterKey } from '#lib/clusters-factory.ts';
import { useIsDarkMode } from '#lib/dark-mode.ts';
import { selectTargetIds } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';
import { getTargetPoints } from '#targets/targets-markers-factory.ts';

interface TargetMarker {
	color: string;
	id: string;
	latitude: number;
	longitude: number;
}

function getPointColor(status: LocationStatus | undefined, isDark: boolean) {
	if (!status) return isDark ? tailwindColors.sky400 : tailwindColors.sky500;

	const record = LocationStatusRecords[status];

	return isDark ? record.colorDark : record.color;
}

function getTargetMarkers({
	clusters,
	isDark,
	rows,
	targets,
}: {
	clusters: ReadonlyMap<string, ClusterPosition>;
	isDark: boolean;
	rows: ReadonlyArray<MapSourceItem>;
	targets: ReadonlyArray<PositionedPoint>;
}) {
	const markers = new Map<string, TargetMarker>();

	for (const { coordinates, id } of targets) {
		const cluster = clusters.get(id);

		if (!cluster) {
			const color = getPointColor(getMapRowById(rows, id)?.properties.status, isDark);
			const [longitude, latitude] = coordinates;

			markers.set(id, { color, id, latitude, longitude });
			continue;
		}

		const clusterKey = getClusterKey(cluster.clusterId);
		const color = isDark ? tailwindColors.sky400 : tailwindColors.sky500;
		const [longitude, latitude] = cluster.coordinates;

		markers.set(clusterKey, { color, id: clusterKey, latitude, longitude });
	}

	return [...markers.values()];
}

function useTargetMarkers() {
	const { pointCollection } = useMapCanvasData();
	const targetIds = useMapStore(selectTargetIds);
	const isDark = useIsDarkMode();
	const rows = pointCollection.features;

	const targets = useMemo(() => getTargetPoints(rows, targetIds), [rows, targetIds]);
	const clusters = useClusterPositions(targets);

	return useMemo(
		() => (clusters ? getTargetMarkers({ clusters, isDark, rows, targets }) : []),
		[clusters, isDark, rows, targets],
	);
}

const pulseDurationMs = 2000;

// Rings mount at different moments, so each backdates its pulse to the page clock's phase
function getPulseDelay() {
	return `-${String(Math.round(performance.now() % pulseDurationMs))}ms`;
}

const MapPulseRing: FC<{ color: string }> = function MapPulseRing({ color }) {
	const [animationDelay] = useState(getPulseDelay);

	return (
		<div className="map-pulse-ring-frame">
			<span
				className="map-pulse-ring"
				style={{
					animationDelay,
					animationDuration: `${String(pulseDurationMs)}ms`,
					borderColor: color,
				}}
			/>
		</div>
	);
};

export const MapTargetMarkers: FC = function MapTargetMarkers() {
	const markers = useTargetMarkers();

	return markers.map(({ color, id, latitude, longitude }) => (
		<Marker anchor="center" key={id} latitude={latitude} longitude={longitude}>
			<MapPulseRing color={color} />
		</Marker>
	));
};
