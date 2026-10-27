import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { FC } from 'react';

import { getMapRowLabel } from '@spectralcodex/map-codec';
import { memo } from 'react';
import { Marker } from 'react-map-gl/maplibre';

import type { MapHoverCluster } from '#types.ts';

import { useMapRow } from '#data/data-query.ts';
import { useIsDarkMode } from '#lib/dark-mode.ts';
import { getPointsLabelPaint } from '#source/source-labels.tsx';
import { clustersLabelPaint } from '#source/source-points.tsx';
import { isLabelledTarget, selectTargetIds } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';

const MapHoverPointLabel: FC<{ row: MapSourceItem }> = function MapHoverPointLabel({ row }) {
	const isDarkMode = useIsDarkMode();
	const paint = getPointsLabelPaint(isDarkMode);
	const [longitude, latitude] = row.geometry.coordinates;

	return (
		<Marker
			anchor="bottom"
			className="map-label"
			latitude={latitude}
			longitude={longitude}
			style={{ color: paint['text-color'], WebkitTextStrokeColor: paint['text-halo-color'] }}
		>
			{getMapRowLabel(row.properties)}
		</Marker>
	);
};

const MapHoverClusterLabel: FC<{ cluster: MapHoverCluster }> = function MapHoverClusterLabel({
	cluster,
}) {
	const [longitude, latitude] = cluster.geometry.coordinates;

	if (longitude === undefined || latitude === undefined) return;

	return (
		<Marker
			anchor="center"
			className="map-label-count"
			latitude={latitude}
			longitude={longitude}
			style={{
				color: clustersLabelPaint['text-color'],
				WebkitTextStrokeColor: clustersLabelPaint['text-halo-color'],
			}}
		>
			{String(cluster.properties?.point_count_abbreviated)}
		</Marker>
	);
};

export const MapHoverLabel: FC = memo(function MapHoverLabel() {
	const hoveredCluster = useMapStore((state) => state.hoveredCluster);
	const hoveredId = useMapStore((state) => state.hoveredId);
	const selectedId = useMapStore((state) => state.selectedId);
	const targetIds = useMapStore(selectTargetIds);

	const hoveredRow = useMapRow(hoveredCluster || selectedId ? undefined : hoveredId);

	if (hoveredRow && !isLabelledTarget(hoveredRow.properties, targetIds)) {
		return <MapHoverPointLabel row={hoveredRow} />;
	}

	if (hoveredCluster) return <MapHoverClusterLabel cluster={hoveredCluster} />;

	return;
});
