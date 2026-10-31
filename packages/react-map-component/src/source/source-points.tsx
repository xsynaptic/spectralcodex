import type { ExpressionSpecification } from 'maplibre-gl';
import type { FC } from 'react';
import type { CircleLayerSpecification, SymbolLayerSpecification } from 'react-map-gl/maplibre';

import { memo, useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';

import type { MapRowCollection } from '#data/data-filter.ts';
import type { ClusterRamp, StatusColors } from '#lib/canvas-palette.ts';

import { canvasStatuses, getCanvasPalette } from '#lib/canvas-palette.ts';
import { pointClusterOptions } from '#lib/clusters-factory.ts';
import { useIsDarkMode } from '#lib/dark-mode.ts';
import { MapLayerIdEnum, MapSlotIdEnum, MapSourceIdEnum } from '#source/source-config.ts';

// Hover/select visuals read feature-state (set imperatively) so these paint specs never rebuild per interaction
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

function getClusterRamp([few, some, many, most]: ClusterRamp) {
	return [
		'interpolate',
		['linear'],
		['get', 'point_count'],
		0,
		few,
		10,
		some,
		80,
		many,
		150,
		most,
	] satisfies ExpressionSpecification;
}

function getStatusMatch(colors: StatusColors, fallback: string) {
	const [first, ...rest] = Object.entries(colors);

	if (!first) throw new Error('A status match needs at least one status');

	return [
		'match',
		['string', ['get', 'status']],
		...first,
		...rest.flat(),
		fallback,
	] satisfies ExpressionSpecification;
}

export function getClustersLabelPaint(isDarkMode: boolean) {
	const palette = getCanvasPalette(isDarkMode);

	return {
		'text-color': palette.clusterLabel,
		'text-halo-color': palette.clusterLabelHalo,
		'text-halo-width': 1,
	} satisfies SymbolLayerSpecification['paint'];
}

function getClustersLabelLayerStyle(isDarkMode: boolean) {
	return {
		filter: ['has', 'point_count'],
		id: MapLayerIdEnum.ClustersLabel,
		layout: {
			'text-allow-overlap': true,
			'text-field': '{point_count_abbreviated}',
			'text-font': ['Noto Sans Medium'],
			'text-ignore-placement': true,
			'text-size': 10,
		},
		paint: {
			...getClustersLabelPaint(isDarkMode),
			'text-opacity': ['case', hoverStateExpression, 0, 1],
		},
		source: MapSourceIdEnum.PointCollection,
		type: 'symbol',
	} satisfies SymbolLayerSpecification;
}

function getClustersLayerStyle(isDarkMode: boolean) {
	const palette = getCanvasPalette(isDarkMode);

	return {
		filter: ['has', 'point_count'],
		id: MapLayerIdEnum.Clusters,
		layout: {
			'circle-sort-key': ['-', ['get', 'point_count']],
		},
		paint: {
			'circle-color': getClusterRamp(palette.clusterFill),
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
			'circle-stroke-color': getClusterRamp(palette.clusterStroke),
			'circle-stroke-width': 1,
		},
		source: MapSourceIdEnum.PointCollection,
		type: 'circle',
	} satisfies CircleLayerSpecification;
}

// Inner dot marking points with a featured image; every radius is 3/8 of its Points layer counterpart
function getPointsImageLayerStyle(isDarkMode: boolean) {
	return {
		filter: [
			'all',
			['!', ['has', 'point_count']], // Not a cluster
			['boolean', ['get', 'hasImage'], false], // Has featured image
		],
		id: MapLayerIdEnum.PointsImage,
		paint: {
			'circle-color': getStatusMatch(getCanvasPalette(isDarkMode).statusTint, 'white'),
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
	const palette = getCanvasPalette(isDarkMode);

	return {
		filter: ['!', ['has', 'point_count']],
		id: MapLayerIdEnum.Points,
		paint: {
			'circle-color': getStatusMatch(palette.statusFill, 'gray'),
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
			'circle-stroke-color': getStatusMatch(palette.statusStroke, 'gray'),
			'circle-stroke-width': 1,
		},
		source: MapSourceIdEnum.PointCollection,
		type: 'circle',
	} satisfies CircleLayerSpecification;
}

// Visually obscured tap targets for all visible points; this makes the mobile experience better
// Note: this has to be instantiated first to be underneath the main point
function getPointsTargetLayerStyle(isDarkMode: boolean) {
	return {
		filter: ['!', ['has', 'point_count']],
		id: MapLayerIdEnum.PointsTarget,
		paint: {
			'circle-color': getStatusMatch(getCanvasPalette(isDarkMode).statusFill, 'gray'),
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
			clustersLabel: getClustersLabelLayerStyle(isDarkMode),
			points: getPointsLayerStyle(isDarkMode),
			pointsImage: getPointsImageLayerStyle(isDarkMode),
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
			canvasStatuses.map((status) => [
				status,
				['+', ['case', ['==', ['get', 'status'], status], 1, 0]],
			]),
		);

		return {
			cluster: interactive,
			clusterMaxZoom: pointClusterOptions.maxZoom,
			clusterMinPoints: pointClusterOptions.minPoints,
			clusterProperties,
			clusterRadius: pointClusterOptions.radius,
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
			{interactive ? (
				<Layer beforeId={MapSlotIdEnum.Points} {...pointsStyle.clusters} />
			) : undefined}
			{interactive ? (
				<Layer beforeId={MapSlotIdEnum.Points} {...pointsStyle.clustersLabel} />
			) : undefined}
			<Layer beforeId={MapSlotIdEnum.Points} {...pointsStyle.pointsTarget} />
			<Layer beforeId={MapSlotIdEnum.Points} {...pointsStyle.points} />
			<Layer beforeId={MapSlotIdEnum.Points} {...pointsStyle.pointsImage} />
		</Source>
	);
});
