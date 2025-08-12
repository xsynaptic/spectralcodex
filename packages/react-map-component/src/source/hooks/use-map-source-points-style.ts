import type { ExpressionSpecification } from 'maplibre-gl';
import type { CircleLayerSpecification, SymbolLayerSpecification } from 'react-map-gl/maplibre';

import { useMemo } from 'react';

import { mapClusterStyle } from '../../config/colors';
import { MapLayerIdEnum } from '../../config/layer';
import { MapSourceIdEnum } from '../../config/source';
import { useDarkMode } from '../../lib/hooks/use-dark-mode';
import { useMapHoveredId, useMapSelectedId } from '../../store/hooks/use-map-store';
import { statusColorMap, statusStrokeColorMap } from '../map-source-utils';

export function useMapSourcePointsStyle(spritesPrefix = 'custom') {
	const selectedId = useMapSelectedId();
	const hoveredId = useMapHoveredId();
	const isDarkMode = useDarkMode();

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
						mapClusterStyle.circleSmFill,
						10,
						mapClusterStyle.circleMdFill,
						80,
						mapClusterStyle.circleLgFill,
						150,
						mapClusterStyle.circleXlFill,
					],
					'circle-radius': [
						'interpolate',
						['linear'],
						['get', 'point_count'],
						0, // Point count
						['case', isHoveredClusterIdExpression, 9, 7],
						10,
						['case', isHoveredClusterIdExpression, 11, 9],
						60,
						['case', isHoveredClusterIdExpression, 16, 14],
					],
					'circle-stroke-width': 1,
					'circle-stroke-color': [
						'interpolate',
						['linear'],
						['get', 'point_count'],
						0,
						mapClusterStyle.circleSmStroke,
						10,
						mapClusterStyle.circleMdStroke,
						80,
						mapClusterStyle.circleLgStroke,
						150,
						mapClusterStyle.circleXlStroke,
					],
				},
			}) satisfies CircleLayerSpecification,
		[isHoveredClusterIdExpression],
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
					'text-color': mapClusterStyle.countTextColor,
					'text-halo-color': 'rgba(0, 0, 0, 0.2)',
					'text-halo-width': 1,
				},
			}) satisfies SymbolLayerSpecification,
		[isHoveredClusterIdExpression],
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
					...(statusColorMap
						? {
								'circle-color': ['match', ['string', ['get', 'status']], ...statusColorMap, 'gray'],
							}
						: {}),
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
					...(statusStrokeColorMap
						? {
								'circle-stroke-color': [
									'match',
									['string', ['get', 'status']],
									...statusStrokeColorMap,
									'gray',
								],
							}
						: {}),
				},
			}) satisfies CircleLayerSpecification,
		[isSelectedIdExpression, isHoveredIdExpression],
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
					...(statusColorMap
						? {
								'circle-color': ['match', ['string', ['get', 'status']], ...statusColorMap, 'gray'],
							}
						: {}),
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
		[isSelectedIdExpression, isHoveredIdExpression],
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
					'icon-color': ['case', isSelectedIdExpression, '#ffff00', '#ff00ff'],
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
					'text-color': isDarkMode ? '#e7e3e4' : '#3f3f47',
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
