import type { ExpressionSpecification } from 'maplibre-gl';
import type { FC } from 'react';
import type { CircleLayerSpecification } from 'react-map-gl/maplibre';

import {
	LocationStatusEnum,
	statusColorArray,
	statusColorDarkArray,
	statusStrokeColorArray,
	statusStrokeColorDarkArray,
	statusTintColorArray,
	tailwindColors,
} from '@spectralcodex/shared/map';
import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapRowCollection } from '#data/data-filter.ts';

import { useIsDarkMode } from '#lib/dark-mode.ts';
import { MapLayerIdEnum, MapSourceIdEnum, pointClusterRadius } from '#source/source-config.ts';
import { getClustersLabelLayerStyle } from '#source/source-hover.tsx';

const hoverStateExpression = [
	'boolean',
	['feature-state', 'hover'],
	false,
] satisfies ExpressionSpecification;

const selectStateExpression = [
	'boolean',
	['feature-state', 'select'],
	false,
] satisfies ExpressionSpecification;

const clusterRampBright = [
	'interpolate',
	['linear'],
	['get', 'point_count'],
	0,
	tailwindColors.sky600,
	10,
	tailwindColors.sky500,
	80,
	tailwindColors.sky400,
	150,
	tailwindColors.sky300,
] satisfies ExpressionSpecification;

const clusterRampDeep = [
	'interpolate',
	['linear'],
	['get', 'point_count'],
	0,
	tailwindColors.sky700,
	10,
	tailwindColors.sky600,
	80,
	tailwindColors.sky500,
	150,
	tailwindColors.sky400,
] satisfies ExpressionSpecification;

function getClustersLayerStyle(isDarkMode: boolean) {
	return {
		filter: ['has', 'point_count'],
		id: MapLayerIdEnum.Clusters,
		layout: {
			'circle-sort-key': ['-', ['get', 'point_count']],
		},
		paint: {
			'circle-color': isDarkMode ? clusterRampDeep : clusterRampBright,
			'circle-radius': [
				'interpolate',
				['linear'],
				['get', 'point_count'],
				0, // Point count
				['case', hoverStateExpression, 9, 7],
				20,
				['case', hoverStateExpression, 11, 9],
				60,
				['case', hoverStateExpression, 14, 12],
			],
			'circle-stroke-color': isDarkMode ? clusterRampBright : clusterRampDeep,
			'circle-stroke-width': 1,
		},
		source: MapSourceIdEnum.PointCollection,
		type: 'circle',
	} satisfies CircleLayerSpecification;
}

function getPointsImageLayerStyle() {
	return {
		filter: [
			'all',
			['!', ['has', 'point_count']], // Not a cluster
			['boolean', ['get', 'hasImage'], false], // Has featured image
		],
		id: MapLayerIdEnum.PointsImage,
		paint: {
			'circle-color': ['match', ['string', ['get', 'status']], ...statusTintColorArray, 'white'],
			'circle-radius': [
				'interpolate',
				['linear'],
				['zoom'],
				0, // Zoom level followed by radius (repeated)
				['case', selectStateExpression, 1.875, hoverStateExpression, 1.125, 0.75],
				8,
				['case', selectStateExpression, 2.25, hoverStateExpression, 1.875, 1.5],
				12,
				['case', selectStateExpression, 3, hoverStateExpression, 2.25, 1.875],
				15,
				['case', selectStateExpression, 3.75, hoverStateExpression, 3, 2.625],
				18,
				['case', selectStateExpression, 4.5, hoverStateExpression, 3.375, 3],
			],
		},
		source: MapSourceIdEnum.PointCollection,
		type: 'circle',
	} satisfies CircleLayerSpecification;
}

function getPointsLayerStyle(isDarkMode: boolean) {
	return {
		filter: ['!', ['has', 'point_count']],
		id: MapLayerIdEnum.Points,
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
				['case', selectStateExpression, 5, hoverStateExpression, 3, 2],
				8,
				['case', selectStateExpression, 6, hoverStateExpression, 5, 4],
				12,
				['case', selectStateExpression, 8, hoverStateExpression, 6, 5],
				15,
				['case', selectStateExpression, 10, hoverStateExpression, 8, 7],
				18,
				['case', selectStateExpression, 12, hoverStateExpression, 9, 8],
			],
			'circle-stroke-color': [
				'match',
				['string', ['get', 'status']],
				...(isDarkMode ? statusStrokeColorDarkArray : statusStrokeColorArray),
				'gray',
			],
			'circle-stroke-width': 1,
		},
		source: MapSourceIdEnum.PointCollection,
		type: 'circle',
	} satisfies CircleLayerSpecification;
}

function getPointsTargetLayerStyle(isDarkMode: boolean) {
	return {
		filter: ['!', ['has', 'point_count']],
		id: MapLayerIdEnum.PointsTarget,
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
				['case', selectStateExpression, 9, hoverStateExpression, 6, 5],
				8,
				['case', selectStateExpression, 14, hoverStateExpression, 11, 10],
				12,
				['case', selectStateExpression, 16, hoverStateExpression, 13, 12],
				15,
				['case', selectStateExpression, 20, hoverStateExpression, 16, 15],
				18,
				['case', selectStateExpression, 24, hoverStateExpression, 21, 20],
			],
		},
		source: MapSourceIdEnum.PointCollection,
		type: 'circle',
	} satisfies CircleLayerSpecification;
}

function useMapSourcePointsStyle() {
	const isDarkMode = useIsDarkMode();

	return useMemo(
		() => ({
			clusters: getClustersLayerStyle(isDarkMode),
			clustersLabel: getClustersLabelLayerStyle(MapSourceIdEnum.PointCollection),
			points: getPointsLayerStyle(isDarkMode),
			pointsImage: getPointsImageLayerStyle(),
			pointsTarget: getPointsTargetLayerStyle(isDarkMode),
		}),
		[isDarkMode],
	);
}

// `clusterProperties` cannot change after the source is created, so only values fixed for the session belong there
export const MapSourcePoints: FC<{
	data: MapRowCollection;
	interactive: boolean;
}> = memo(function MapPointLayerContents({ data, interactive }) {
	const pointsStyle = useMapSourcePointsStyle();

	const clusterConfig = useMemo(() => {
		const clusterProperties: Record<string, unknown> = Object.fromEntries(
			Object.values(LocationStatusEnum).map((status) => [
				status,
				['+', ['case', ['==', ['get', 'status'], status], 1, 0]],
			]),
		);

		return {
			cluster: interactive,
			clusterMaxZoom: 14, // Max zoom to cluster points on
			clusterMinPoints: 2, // Minimum number of points to cluster
			clusterProperties,
			clusterRadius: pointClusterRadius,
		};
	}, [interactive]);

	// react-map-gl needs each Layer as an immediate child of Source; no Fragment
	return (
		<Source
			data={data}
			id={MapSourceIdEnum.PointCollection}
			promoteId="id"
			type="geojson"
			{...clusterConfig}
		>
			{interactive ? <Layer {...pointsStyle.clusters} /> : undefined}
			{interactive ? <Layer {...pointsStyle.clustersLabel} /> : undefined}
			<Layer {...pointsStyle.pointsTarget} />
			<Layer {...pointsStyle.points} />
			<Layer {...pointsStyle.pointsImage} />
		</Source>
	);
});
