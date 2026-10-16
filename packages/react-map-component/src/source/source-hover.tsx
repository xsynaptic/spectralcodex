import type { ExpressionSpecification } from 'maplibre-gl';
import type { FC } from 'react';
import type { SymbolLayerSpecification } from 'react-map-gl/maplibre';

import { tailwindColors } from '@spectralcodex/shared/map';
import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import { useMapRow } from '#data/data-query.ts';
import { useIsDarkMode } from '#lib/dark-mode.ts';
import { MapLayerIdEnum, MapSourceIdEnum } from '#source/source-config.ts';
import { useMapStore } from '#store/store.tsx';

const hoverStateExpression = [
	'boolean',
	['feature-state', 'hover'],
	false,
] satisfies ExpressionSpecification;

export function getClustersLabelLayerStyle(
	source: typeof MapSourceIdEnum.HoverCollection | typeof MapSourceIdEnum.PointCollection,
) {
	const isHover = source === MapSourceIdEnum.HoverCollection;

	return {
		filter: ['has', 'point_count'],
		id: isHover ? MapLayerIdEnum.ClustersLabelHover : MapLayerIdEnum.ClustersLabel,
		layout: {
			'text-allow-overlap': true,
			'text-field': '{point_count_abbreviated}',
			'text-font': ['Noto Sans Medium'],
			'text-ignore-placement': true,
			'text-size': isHover ? 12 : 10,
		},
		paint: {
			'text-color': tailwindColors.sky50,
			'text-halo-color': 'rgba(0, 0, 0, 0.2)',
			'text-halo-width': 1,
			...(isHover ? {} : { 'text-opacity': ['case', hoverStateExpression, 0, 1] }),
		},
		source,
		type: 'symbol',
	} satisfies SymbolLayerSpecification;
}

export function getPointsLabelPaint(isDarkMode: boolean) {
	return {
		'text-color': isDarkMode ? tailwindColors.zinc200 : tailwindColors.zinc700,
		'text-halo-color': isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
		'text-halo-width': 1.2,
	} satisfies SymbolLayerSpecification['paint'];
}

function getPointsLabelLayerStyle(isDarkMode: boolean) {
	return {
		filter: ['!', ['has', 'point_count']],
		id: MapLayerIdEnum.PointsLabel,
		layout: {
			'text-field': [
				'case',
				['has', 'titleMultilingual'],
				['concat', ['get', 'title'], ' (', ['get', 'titleMultilingual'], ')'],
				['get', 'title'],
			],
			'text-font': ['Noto Sans Medium'],
			'text-ignore-placement': true,
			'text-justify': 'auto',
			'text-max-width': 20,
			'text-size': 11,
			'text-variable-anchor': ['bottom', 'right'],
			'text-variable-anchor-offset': ['bottom', [0, -0.9], 'right', [-0.8, 0]],
		},
		paint: getPointsLabelPaint(isDarkMode),
		source: MapSourceIdEnum.HoverCollection,
		type: 'symbol',
	} satisfies SymbolLayerSpecification;
}

export const MapSourceHover: FC = memo(function MapSourceHover() {
	const isDarkMode = useIsDarkMode();
	const hoveredCluster = useMapStore((state) => state.hoveredCluster);
	const hoveredId = useMapStore((state) => state.hoveredId);
	const selectedId = useMapStore((state) => state.selectedId);

	const hoveredRow = useMapRow(hoveredCluster || selectedId ? undefined : hoveredId);

	const data = useMemo(() => {
		const labelFeature = hoveredRow ?? hoveredCluster;

		return { features: labelFeature ? [labelFeature] : [], type: 'FeatureCollection' as const };
	}, [hoveredCluster, hoveredRow]);

	const clustersLabelStyle = useMemo(
		() => getClustersLabelLayerStyle(MapSourceIdEnum.HoverCollection),
		[],
	);
	const pointsLabelStyle = useMemo(() => getPointsLabelLayerStyle(isDarkMode), [isDarkMode]);

	return (
		<Source data={data} id={MapSourceIdEnum.HoverCollection} type="geojson">
			<Layer {...clustersLabelStyle} />
			<Layer {...pointsLabelStyle} />
		</Source>
	);
});
