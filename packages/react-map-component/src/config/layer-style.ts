import * as R from 'remeda';

import type { CircleLayer, LineLayer, SymbolLayer } from 'react-map-gl/maplibre';

import { getMapClusterStyle, locationStatusStyle } from './colors';
import { mapLayerIds } from './layer';
import { MapSourceIdEnum } from './source';

interface StyleIdentifiers {
	id: (typeof mapLayerIds)[keyof typeof mapLayerIds];
	source: (typeof MapSourceIdEnum)[keyof typeof MapSourceIdEnum];
}

// MapLibre expects some style properties to have at least two items
const isDoubleStringArray = (array: Array<string>): array is [string, string, ...Array<string>] =>
	array.length >= 2;

const getColorMap = (
	styleRecord: typeof locationStatusStyle,
	prop: keyof (typeof locationStatusStyle)[keyof typeof locationStatusStyle],
) => {
	const colorMap = R.pipe(
		R.entries(styleRecord),
		R.flatMap(([status, values]) => [status, values[prop]]),
	);

	return isDoubleStringArray(colorMap) ? colorMap : undefined;
};

// This creates an array of status and color values for use with clusters in MapLibre
const statusColorMap = getColorMap(locationStatusStyle, 'color');

const statusStrokeColorMap = getColorMap(locationStatusStyle, 'stroke');

const mapClusterStyle = getMapClusterStyle('sky');

const getClusterCircleLayerStyle = (identifiers: StyleIdentifiers) =>
	({
		...identifiers,
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
	}) satisfies CircleLayer;

// Add numeric labels to clusters
const getClusterSymbolLayerStyle = (identifiers: StyleIdentifiers) =>
	({
		...identifiers,
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
	}) satisfies SymbolLayer;

// Visually obscured tap targets for all visible points; this makes the mobile experience better
// Note: this has to be instantiated first to be underneath the main point
const getPointsTargetLayerStyle = (identifiers: StyleIdentifiers) =>
	({
		...identifiers,
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
				0, // Zoom level
				5, // Radius
				8,
				10,
				12,
				12,
				15,
				15,
				18,
				20,
			],
		},
	}) satisfies CircleLayer;

// Visual points for unfiltered (i.e. zoomed-in) points
const getPointsLayerStyle = (identifiers: StyleIdentifiers) =>
	({
		...identifiers,
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
				0, // Zoom level
				2, // Radius
				8,
				4,
				12,
				5,
				15,
				7,
				18,
				8,
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
	}) satisfies CircleLayer;

// Experimental line drawing style
const getLineStringStyle = (identifiers: StyleIdentifiers) =>
	({
		...identifiers,
		type: 'line',
		layout: {
			'line-join': 'round',
			'line-cap': 'round',
		},
		paint: {
			...(statusColorMap
				? {
						'line-color': ['match', ['string', ['get', 'status']], ...statusColorMap, 'gray'],
					}
				: {}),
			'line-width': [
				'interpolate',
				['linear'],
				['zoom'],
				0, // Zoom level
				2, // Radius
				8,
				3,
				12,
				5,
				15,
				8,
				18,
				10,
			],
		},
	}) satisfies LineLayer;

export const layerStyles = {
	clusterCircle: getClusterCircleLayerStyle({
		id: mapLayerIds.clusters,
		source: MapSourceIdEnum.PointCollection,
	}),
	clusterSymbol: getClusterSymbolLayerStyle({
		id: mapLayerIds.clustersLabel,
		source: MapSourceIdEnum.PointCollection,
	}),
	pointsTarget: getPointsTargetLayerStyle({
		id: mapLayerIds.pointsTarget,
		source: MapSourceIdEnum.PointCollection,
	}),
	points: getPointsLayerStyle({ id: mapLayerIds.points, source: MapSourceIdEnum.PointCollection }),
	multiPointsTarget: getPointsTargetLayerStyle({
		id: mapLayerIds.pointsTarget,
		source: MapSourceIdEnum.MultiPointCollection,
	}),
	multiPoints: getPointsLayerStyle({
		id: mapLayerIds.points,
		source: MapSourceIdEnum.MultiPointCollection,
	}),
	lineString: getLineStringStyle({
		id: mapLayerIds.lineString,
		source: MapSourceIdEnum.LineStringCollection,
	}),
};
