import type { CircleLayerSpecification, SymbolLayerSpecification } from 'react-map-gl/maplibre';

import { useMemo } from 'react';

import { mapClusterStyle } from '../../config/colors';
import { MapLayerIdEnum } from '../../config/layer';
import { MapSourceIdEnum } from '../../config/source';
import { statusColorMap, statusStrokeColorMap } from '../map-source-utils';

export function useMapSourcePointsStyle(spritesPrefix = 'custom') {
	const clustersLayerStyle = useMemo(
		() =>
			({
				id: MapLayerIdEnum.Clusters,
				source: MapSourceIdEnum.PointCollection,
				type: 'circle',
				filter: ['has', 'point_count'],
				layout: {
					'circle-sort-key': 0,
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
						7, // Radius
						10,
						9,
						60,
						14,
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
		[],
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
					'text-size': 10,
					'text-allow-overlap': true,
				},
				paint: {
					'text-color': mapClusterStyle.countTextColor,
					'text-halo-color': 'rgba(0, 0, 0, 0.2)',
					'text-halo-width': 1,
				},
			}) satisfies SymbolLayerSpecification,
		[],
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
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							5,
							['boolean', ['feature-state', 'hover'], false],
							3,
							2,
						],
						8,
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							6,
							['boolean', ['feature-state', 'hover'], false],
							5,
							4,
						],
						12,
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							8,
							['boolean', ['feature-state', 'hover'], false],
							6,
							5,
						],
						15,
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							10,
							['boolean', ['feature-state', 'hover'], false],
							8,
							7,
						],
						18,
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							12,
							['boolean', ['feature-state', 'hover'], false],
							9,
							8,
						],
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
		[],
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
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							9,
							['boolean', ['feature-state', 'hover'], false],
							6,
							5,
						],
						8,
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							14,
							['boolean', ['feature-state', 'hover'], false],
							11,
							10,
						],
						12,
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							16,
							['boolean', ['feature-state', 'hover'], false],
							13,
							12,
						],
						15,
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							20,
							['boolean', ['feature-state', 'hover'], false],
							16,
							15,
						],
						18,
						[
							'case',
							['boolean', ['feature-state', 'selected'], false],
							24,
							['boolean', ['feature-state', 'hover'], false],
							21,
							20,
						],
					],
				},
			}) satisfies CircleLayerSpecification,
		[],
	);

	// Featured image overlay for points with images
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
						['boolean', ['feature-state', 'selected'], false],
						'#ffffff',
						'#ffffff',
					],
				},
			}) satisfies SymbolLayerSpecification,
		[],
	);

	return {
		[MapLayerIdEnum.Clusters]: clustersLayerStyle,
		[MapLayerIdEnum.ClustersLabel]: clustersLabelLayerStyle,
		[MapLayerIdEnum.Points]: pointsLayerStyle,
		[MapLayerIdEnum.PointsTarget]: pointsTargetLayerStyle,
		[MapLayerIdEnum.PointsImage]: pointsImageLayerStyle,
	};
}
