import type { FC } from 'react';
import type { SymbolLayerSpecification } from 'react-map-gl/maplibre';

import { tailwindColors } from '@spectralcodex/shared/map';
import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapHoverFeature } from '#types.ts';

import { useIsDarkMode } from '#lib/dark-mode.tsx';
import { MapLayerIdEnum, MapSourceIdEnum } from '#source/source-config.ts';
import { useMapHoveredFeature, useMapSelectedId } from '#store/store.ts';

function getClustersLabelHoverLayerStyle() {
	return {
		filter: ['has', 'point_count'],
		id: MapLayerIdEnum.ClustersLabelHover,
		layout: {
			'text-allow-overlap': true,
			'text-field': '{point_count_abbreviated}',
			'text-font': ['Noto Sans Medium'],
			'text-ignore-placement': true,
			'text-size': 12,
		},
		paint: {
			'text-color': tailwindColors.sky50,
			'text-halo-color': 'rgba(0, 0, 0, 0.2)',
			'text-halo-width': 1,
		},
		source: MapSourceIdEnum.HoverCollection,
		type: 'symbol',
	} satisfies SymbolLayerSpecification;
}

// Text labels for individual points on hover
function getPointsLabelLayerStyle(isDarkMode: boolean) {
	return {
		filter: ['!', ['has', 'point_count']],
		id: MapLayerIdEnum.PointsLabel,
		layout: {
			'text-field': ['get', 'title'],
			'text-font': ['Noto Sans Medium'],
			'text-ignore-placement': true,
			'text-justify': 'auto',
			'text-max-width': 20,
			'text-size': 11,
			'text-variable-anchor': ['bottom', 'right'],
			// We'd like to interpolate these values but there is a type issue with MapLibre
			'text-variable-anchor-offset': ['bottom', [0, -0.9], 'right', [-0.8, 0]],
		},
		paint: {
			'text-color': isDarkMode ? tailwindColors.zinc200 : tailwindColors.zinc700,
			'text-halo-color': isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
			'text-halo-width': 1.2,
		},
		source: MapSourceIdEnum.HoverCollection,
		type: 'symbol',
	} satisfies SymbolLayerSpecification;
}

function isClusterFeature(feature: MapHoverFeature) {
	return feature.properties?.point_count !== undefined;
}

export const MapSourceHover: FC = memo(function MapSourceHover() {
	const isDarkMode = useIsDarkMode();
	const hoveredFeature = useMapHoveredFeature();
	const selectedId = useMapSelectedId();

	// Hover labels are off while a popup is open; they would draw underneath it
	const labelFeature =
		hoveredFeature && (!selectedId || isClusterFeature(hoveredFeature))
			? hoveredFeature
			: undefined;

	const data = useMemo(
		() => ({
			features: labelFeature ? [labelFeature] : [],
			type: 'FeatureCollection' as const,
		}),
		[labelFeature],
	);

	const clustersLabelHoverLayerStyle = useMemo(() => getClustersLabelHoverLayerStyle(), []);

	const pointsLabelLayerStyle = useMemo(() => getPointsLabelLayerStyle(isDarkMode), [isDarkMode]);

	return (
		<Source data={data} id={MapSourceIdEnum.HoverCollection} type="geojson">
			<Layer key={MapLayerIdEnum.ClustersLabelHover} {...clustersLabelHoverLayerStyle} />
			<Layer key={MapLayerIdEnum.PointsLabel} {...pointsLabelLayerStyle} />
		</Source>
	);
});
