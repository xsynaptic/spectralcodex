import type { ExpressionSpecification } from 'maplibre-gl';
import type { FC } from 'react';
import type { CircleLayerSpecification, SymbolLayerSpecification } from 'react-map-gl/maplibre';

import { LocationStatusEnum } from '@spectralcodex/map-types';
import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapSourceFeatureCollection } from '../types';

import { useDarkMode } from '../lib/dark-mode';
import {
	statusColorArray,
	statusColorDarkArray,
	statusStrokeColorArray,
	statusStrokeColorDarkArray,
} from '../lib/location-status';
import { tailwindColors } from '../lib/tailwind-colors';
import { useMapHoveredId, useMapSelectedId } from '../store/store';
import { MapLayerIdEnum, MapSourceIdEnum } from './source-config';

function useMapSourcePointsStyle(spritesPrefix = 'custom'): {
	[MapLayerIdEnum.Clusters]: CircleLayerSpecification;
	[MapLayerIdEnum.ClustersLabel]: SymbolLayerSpecification;
	[MapLayerIdEnum.Points]: CircleLayerSpecification;
	[MapLayerIdEnum.PointsTarget]: CircleLayerSpecification;
	[MapLayerIdEnum.PointsImage]: SymbolLayerSpecification;
	[MapLayerIdEnum.PointsLabel]: SymbolLayerSpecification;
} {
	const isDarkMode = useDarkMode();

	const selectedId = useMapSelectedId();
	const hoveredId = useMapHoveredId();

	const isSelectedIdExpression = useMemo(
		() => ['==', ['get', 'id'], selectedId ?? ''] satisfies ExpressionSpecification,
		[selectedId],
	);
	const isHoveredIdExpression = useMemo(
		() => ['==', ['get', 'id'], hoveredId ?? ''] satisfies ExpressionSpecification,
		[hoveredId],
	);
	const isHoveredClusterIdExpression = useMemo(
		() =>
			[
				'==',
				['concat', 'cluster-', ['get', 'cluster_id']],
				hoveredId ?? '',
			] satisfies ExpressionSpecification,
		[hoveredId],
	);

	const clustersLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.Clusters,
				source: MapSourceIdEnum.PointCollection,
				type: 'circle',
				filter: ['has', 'point_count'],
				layout: {
					// Sort clusters by point count, descending
					'circle-sort-key': ['-', ['get', 'point_count']],
				},
				paint: {
					'circle-color': [
						'interpolate',
						['linear'],
						['get', 'point_count'],
						0,
						isDarkMode ? tailwindColors.sky700 : tailwindColors.sky600,
						10,
						isDarkMode ? tailwindColors.sky600 : tailwindColors.sky500,
						80,
						isDarkMode ? tailwindColors.sky500 : tailwindColors.sky400,
						150,
						isDarkMode ? tailwindColors.sky400 : tailwindColors.sky300,
					],
					'circle-radius': [
						'interpolate',
						['linear'],
						['get', 'point_count'],
						0, // Point count
						['case', isHoveredClusterIdExpression, 9, 7],
						20,
						['case', isHoveredClusterIdExpression, 11, 9],
						60,
						['case', isHoveredClusterIdExpression, 14, 12],
					],
					'circle-stroke-width': 1,
					'circle-stroke-color': [
						'interpolate',
						['linear'],
						['get', 'point_count'],
						0,
						isDarkMode ? tailwindColors.sky600 : tailwindColors.sky700,
						10,
						isDarkMode ? tailwindColors.sky500 : tailwindColors.sky600,
						80,
						isDarkMode ? tailwindColors.sky400 : tailwindColors.sky500,
						150,
						isDarkMode ? tailwindColors.sky300 : tailwindColors.sky400,
					],
				},
			}) satisfies CircleLayerSpecification,
		[isDarkMode, isHoveredClusterIdExpression],
	);

	// Numeric labels for clusters
	const clustersLabelLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.ClustersLabel,
				source: MapSourceIdEnum.PointCollection,
				type: 'symbol',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': '{point_count_abbreviated}',
					'text-font': ['Noto Sans Medium'],
					'text-size': ['case', isHoveredClusterIdExpression, 12, 10],
					'text-allow-overlap': true,
					'text-ignore-placement': true,
				},
				paint: {
					'text-color': isDarkMode ? tailwindColors.sky50 : tailwindColors.sky50,
					'text-halo-color': 'rgba(0, 0, 0, 0.2)',
					'text-halo-width': 1,
				},
			}) satisfies SymbolLayerSpecification,
		[isDarkMode, isHoveredClusterIdExpression],
	);

	// Visual points for unfiltered (zoomed-in) points
	const pointsLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.Points,
				source: MapSourceIdEnum.PointCollection,
				type: 'circle',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': [
						'match',
						['string', ['get', 'status']],
						...(isDarkMode ? statusColorDarkArray : statusColorArray),
						'gray',
					],
					'circle-radius': [
						'interpolate',
						['linear'],
						['zoom'],
						0, // Zoom level followed by radius (repeated)
						['case', isSelectedIdExpression, 5, isHoveredIdExpression, 3, 2],
						8,
						['case', isSelectedIdExpression, 6, isHoveredIdExpression, 5, 4],
						12,
						['case', isSelectedIdExpression, 8, isHoveredIdExpression, 6, 5],
						15,
						['case', isSelectedIdExpression, 10, isHoveredIdExpression, 8, 7],
						18,
						['case', isSelectedIdExpression, 12, isHoveredIdExpression, 9, 8],
					],
					'circle-stroke-width': 1,
					'circle-stroke-color': [
						'match',
						['string', ['get', 'status']],
						...(isDarkMode ? statusStrokeColorDarkArray : statusStrokeColorArray),
						'gray',
					],
				},
			}) satisfies CircleLayerSpecification,
		[isDarkMode, isSelectedIdExpression, isHoveredIdExpression],
	);

	// Visually obscured tap targets for all visible points; this makes the mobile experience better
	// Note: this has to be instantiated first to be underneath the main point
	const pointsTargetLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.PointsTarget,
				source: MapSourceIdEnum.PointCollection,
				type: 'circle',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': [
						'match',
						['string', ['get', 'status']],
						...(isDarkMode ? statusColorDarkArray : statusColorArray),
						'gray',
					],
					'circle-opacity': 0.2,
					'circle-radius': [
						'interpolate',
						['linear'],
						['zoom'],
						0, // Zoom level followed by radius (repeated)
						['case', isSelectedIdExpression, 9, isHoveredIdExpression, 6, 5],
						8,
						['case', isSelectedIdExpression, 14, isHoveredIdExpression, 11, 10],
						12,
						['case', isSelectedIdExpression, 16, isHoveredIdExpression, 13, 12],
						15,
						['case', isSelectedIdExpression, 20, isHoveredIdExpression, 16, 15],
						18,
						['case', isSelectedIdExpression, 24, isHoveredIdExpression, 21, 20],
					],
				},
			}) satisfies CircleLayerSpecification,
		[isDarkMode, isSelectedIdExpression, isHoveredIdExpression],
	);

	// Featured image overlay for points with images
	// TODO: this still needs to be implemented but we haven't yet come up with a good design
	const pointsImageLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.PointsImage,
				source: MapSourceIdEnum.PointCollection,
				type: 'symbol',
				filter: [
					'all',
					['!', ['has', 'point_count']], // Not a cluster
					['boolean', ['get', 'hasImage']], // Has featured image
				],
				layout: {
					'icon-image': ['concat', spritesPrefix, ':', 'diamond'],
					'icon-size': [
						'interpolate',
						['linear'],
						['zoom'],
						0, // Zoom level followed by radius (repeated)
						0.5,
						8,
						0.5,
						12,
						0.5,
						15,
						0.5,
						18,
						0.5,
					],
				},
				paint: {
					'icon-color': [
						'case',
						isSelectedIdExpression,
						tailwindColors.red500,
						tailwindColors.red600,
					],
				},
			}) satisfies SymbolLayerSpecification,
		[isSelectedIdExpression, spritesPrefix],
	);

	// Text labels for individual points on hover
	const pointsLabelLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.PointsLabel,
				source: MapSourceIdEnum.PointCollection,
				type: 'symbol',
				filter: [
					'all',
					['!', ['has', 'point_count']], // Not a cluster
					isHoveredIdExpression, // Only show when hovered
				],
				layout: {
					'text-field': ['get', 'title'],
					'text-font': ['Noto Sans Medium'],
					'text-size': 11,
					'text-ignore-placement': true,
					'text-justify': 'auto',
					'text-max-width': 20,
					'text-variable-anchor': ['bottom', 'right'],
					// We'd like to interpolate these values but there is a type issue with MapLibre
					'text-variable-anchor-offset': ['bottom', [0, -0.9], 'right', [-0.8, 0]],
				},
				paint: {
					'text-color': isDarkMode ? tailwindColors.zinc200 : tailwindColors.zinc700,
					'text-halo-color': isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
					'text-halo-width': 1.2,
				},
			}) satisfies SymbolLayerSpecification,
		[isHoveredIdExpression, isDarkMode],
	);

	return {
		[MapLayerIdEnum.Clusters]: clustersLayerStyle,
		[MapLayerIdEnum.ClustersLabel]: clustersLabelLayerStyle,
		[MapLayerIdEnum.Points]: pointsLayerStyle,
		[MapLayerIdEnum.PointsTarget]: pointsTargetLayerStyle,
		[MapLayerIdEnum.PointsImage]: pointsImageLayerStyle,
		[MapLayerIdEnum.PointsLabel]: pointsLabelLayerStyle,
	};
}

export const MapSourcePoints: FC<{
	data: MapSourceFeatureCollection;
	interactive: boolean;
	hasMapIcons: boolean;
}> = memo(function MapPointLayerContents({ data, interactive, hasMapIcons }) {
	const pointsStyle = useMapSourcePointsStyle();

	const clusterConfig = useMemo(() => {
		// Create cluster properties dynamically for each status
		const clusterProperties = Object.fromEntries(
			Object.values(LocationStatusEnum).map((status) => [
				status,
				['+', ['case', ['==', ['get', 'status'], status], 1, 0]],
			]),
		);

		return {
			cluster: interactive,
			clusterRadius: 13, // How much space to provide for clusters; lower number = higher density
			clusterMaxZoom: 14, // Max zoom to cluster points on
			clusterMinPoints: 2, // Minimum number of points to cluster
			clusterProperties,
		};
	}, [interactive]);

	// Note: Layer components need to be immediate children of Source components; do not use React.Fragment here
	return (
		<Source
			id={MapSourceIdEnum.PointCollection}
			type="geojson"
			data={data}
			generateId={true}
			{...clusterConfig}
		>
			{interactive ? (
				<Layer key={MapLayerIdEnum.Clusters} {...pointsStyle[MapLayerIdEnum.Clusters]} />
			) : undefined}
			{interactive ? (
				<Layer key={MapLayerIdEnum.ClustersLabel} {...pointsStyle[MapLayerIdEnum.ClustersLabel]} />
			) : undefined}
			<Layer key={MapLayerIdEnum.PointsTarget} {...pointsStyle[MapLayerIdEnum.PointsTarget]} />
			<Layer key={MapLayerIdEnum.Points} {...pointsStyle[MapLayerIdEnum.Points]} />
			<Layer key={MapLayerIdEnum.PointsLabel} {...pointsStyle[MapLayerIdEnum.PointsLabel]} />
			{hasMapIcons ? (
				<Layer key={MapLayerIdEnum.PointsImage} {...pointsStyle[MapLayerIdEnum.PointsImage]} />
			) : undefined}
		</Source>
	);
});
