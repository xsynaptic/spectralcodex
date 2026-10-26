import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { ExpressionSpecification } from 'maplibre-gl';
import type { FC } from 'react';
import type { LineLayerSpecification } from 'react-map-gl/maplibre';

import { tailwindColors } from '@spectralcodex/shared/map';
import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { ConnectionCollection } from '#source/source-connections-factory.ts';

import { useDisplayedPositions } from '#canvas/canvas-positions.ts';
import { useIsDarkMode } from '#lib/dark-mode.ts';
import { MapLayerIdEnum, MapSourceIdEnum } from '#source/source-config.ts';
import {
	getConnectionCollection,
	getConnectionPoints,
	getConnections,
} from '#source/source-connections-factory.ts';
import { selectConnectionSubjectId } from '#store/store-factory.ts';
import { useMapStore } from '#store/store.tsx';

const emptyCollection: ConnectionCollection = { features: [], type: 'FeatureCollection' };

const connectionKindStyles = {
	link: {
		color: { dark: tailwindColors.stone400, light: tailwindColors.stone500 },
		lineOpacity: 0.45,
	},
	points: {
		color: { dark: tailwindColors.sky400, light: tailwindColors.sky500 },
		lineOpacity: 0.8,
	},
} as const;

type ConnectionKindStyle = (typeof connectionKindStyles)[keyof typeof connectionKindStyles];

function matchKind(getValue: (style: ConnectionKindStyle) => number | string) {
	return [
		'match',
		['get', 'kind'],
		'points',
		getValue(connectionKindStyles.points),
		getValue(connectionKindStyles.link),
	] satisfies ExpressionSpecification;
}

function getConnectionsLayerStyles(isDarkMode: boolean) {
	const layout = { 'line-cap': 'round', 'line-join': 'round' } as const;
	const color = matchKind((style) => (isDarkMode ? style.color.dark : style.color.light));

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
			'line-opacity': matchKind((style) => style.lineOpacity),
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
	const positions = useDisplayedPositions(points, { isClearedOnMove: false });

	return useMemo(
		() => (positions ? getConnectionCollection(connections, positions) : emptyCollection),
		[connections, positions],
	);
}

export const MapSourceConnections: FC<{ rows: ReadonlyArray<MapSourceItem> }> = memo(
	function MapSourceConnections({ rows }) {
		const isDarkMode = useIsDarkMode();
		const data = useConnectionCollection(rows);
		const layerStyles = useMemo(() => getConnectionsLayerStyles(isDarkMode), [isDarkMode]);

		return (
			<Source data={data} id={MapSourceIdEnum.ConnectionCollection} type="geojson">
				<Layer {...layerStyles.band} />
				<Layer {...layerStyles.line} />
			</Source>
		);
	},
);
