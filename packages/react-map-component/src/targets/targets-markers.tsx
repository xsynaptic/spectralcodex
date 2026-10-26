import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LocationStatus } from '@spectralcodex/shared/map';
import type { FC } from 'react';

import { getMapRowById } from '@spectralcodex/map-codec';
import { LocationStatusRecords, tailwindColors } from '@spectralcodex/shared/map';
import { useMemo } from 'react';
import { Marker } from 'react-map-gl/maplibre';

import type { DisplayedPosition } from '#canvas/canvas-positions-factory.ts';

import { useDisplayedPositions } from '#canvas/canvas-positions.ts';
import { useMapRows } from '#data/data-query.ts';
import { getClusterHoverId } from '#lib/cluster-hover.ts';
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

const emptyRows: ReadonlyArray<MapSourceItem> = [];

function getPointColor(status: LocationStatus | undefined, isDark: boolean) {
	if (!status) return isDark ? tailwindColors.sky400 : tailwindColors.sky500;

	const record = LocationStatusRecords[status];

	return isDark ? record.colorDark : record.color;
}

function getTargetMarkers(
	positions: ReadonlyMap<string, DisplayedPosition>,
	rows: ReadonlyArray<MapSourceItem>,
	isDark: boolean,
) {
	const markers = new Map<string, TargetMarker>();

	for (const [id, position] of positions) {
		const [longitude, latitude] = position.coordinates;

		if (position.kind === 'point') {
			const color = getPointColor(getMapRowById(rows, id)?.properties.status, isDark);

			markers.set(id, { color, id, latitude, longitude });
			continue;
		}

		const clusterId = getClusterHoverId(position.clusterId);
		const color = isDark ? tailwindColors.sky400 : tailwindColors.sky500;

		markers.set(clusterId, { color, id: clusterId, latitude, longitude });
	}

	return [...markers.values()];
}

function useTargetMarkers() {
	const { data: sourceData } = useMapRows();
	const targetIds = useMapStore(selectTargetIds);
	const isDark = useIsDarkMode();

	const targets = useMemo(
		() => (sourceData ? getTargetPoints(sourceData, targetIds) : []),
		[sourceData, targetIds],
	);

	const positions = useDisplayedPositions(targets, { isClearedOnMove: true });

	return useMemo(
		() => (positions ? getTargetMarkers(positions, sourceData ?? emptyRows, isDark) : []),
		[isDark, positions, sourceData],
	);
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
