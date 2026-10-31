import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { ExpressionSpecification } from 'maplibre-gl';
import type { FC } from 'react';
import type { LineLayerSpecification } from 'react-map-gl/maplibre';

import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { ConnectionCollection } from '#source/source-connections-factory.ts';

import { useClusterPositions } from '#canvas/canvas-positions.ts';
import { getCanvasPalette } from '#lib/canvas-palette.ts';
import { useIsDarkMode } from '#lib/dark-mode.ts';
import { MapLayerIdEnum, MapSlotIdEnum, MapSourceIdEnum } from '#source/source-config.ts';
import {
	getConnectionCollection,
	getConnectionPoints,
	getConnections,
} from '#source/source-connections-factory.ts';
import { selectConnectionSubjectId } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';

const emptyCollection: ConnectionCollection = { features: [], type: 'FeatureCollection' };

const connectionLineOpacity = { link: 0.45, points: 0.8 } as const;

function matchKind(byKind: { link: number | string; points: number | string }) {
	return [
		'match',
		['get', 'kind'],
		'points',
		byKind.points,
		byKind.link,
	] satisfies ExpressionSpecification;
}

function getConnectionsLayerStyles(isDarkMode: boolean) {
	const palette = getCanvasPalette(isDarkMode);
	const layout = { 'line-cap': 'round', 'line-join': 'round' } as const;
	const color = matchKind({ link: palette.connectionLink, points: palette.connectionPoints });

	const band = {
		id: MapLayerIdEnum.ConnectionsBand,
		layout,
		paint: {
			'line-color': color,
			'line-opacity': 0.1,
			'line-width': 6,
		},
		source: MapSourceIdEnum.ConnectionCollection,
		type: 'line',
	} satisfies LineLayerSpecification;

	const line = {
		id: MapLayerIdEnum.ConnectionsLine,
		layout,
		paint: {
			'line-color': color,
			'line-opacity': matchKind(connectionLineOpacity),
			'line-width': 1,
		},
		source: MapSourceIdEnum.ConnectionCollection,
		type: 'line',
	} satisfies LineLayerSpecification;

	return { band, line };
}

function useConnectionCollection(rows: ReadonlyArray<MapSourceItem>) {
	const subjectId = useMapStore(selectConnectionSubjectId);
	const connections = useMemo(() => getConnections(rows, subjectId), [rows, subjectId]);
	const points = useMemo(() => getConnectionPoints(connections), [connections]);
	const clusters = useClusterPositions(points);

	return useMemo(
		() => (clusters ? getConnectionCollection(connections, clusters) : emptyCollection),
		[clusters, connections],
	);
}

export const MapSourceConnections: FC<{ rows: ReadonlyArray<MapSourceItem> }> = memo(
	function MapSourceConnections({ rows }) {
		const isDarkMode = useIsDarkMode();
		const data = useConnectionCollection(rows);
		const layerStyles = useMemo(() => getConnectionsLayerStyles(isDarkMode), [isDarkMode]);

		return (
			<Source data={data} id={MapSourceIdEnum.ConnectionCollection} type="geojson">
				<Layer beforeId={MapSlotIdEnum.Connections} {...layerStyles.band} />
				<Layer beforeId={MapSlotIdEnum.Connections} {...layerStyles.line} />
			</Source>
		);
	},
);
