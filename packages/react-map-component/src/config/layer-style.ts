import type {
	CircleLayerSpecification,
	LayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
} from 'react-map-gl/maplibre';

import type { MapLayerId } from './layer';
import type { MapSourceId } from './source';

import { locationStatusStyle, mapClusterStyle } from './colors';
import { MapLayerIdEnum } from './layer';
import { MapSourceIdEnum } from './source';

interface StyleIdentifiers {
	id: MapLayerId;
	source: MapSourceId;
}

// MapLibre expects some style properties to have at least two items
const isDoubleStringArray = (array: Array<string>): array is [string, string, ...Array<string>] =>
	array.length >= 2;

const getColorMap = (
	styleRecord: typeof locationStatusStyle,
	prop: keyof (typeof locationStatusStyle)[keyof typeof locationStatusStyle],
) => {
	const colorMap = Object.entries(styleRecord).flatMap(([status, values]) => [
		status,
		values[prop],
	]);

	return isDoubleStringArray(colorMap) ? colorMap : undefined;
};

// This creates an array of status and color values for use with clusters in MapLibre
const statusColorMap = getColorMap(locationStatusStyle, 'color');

const statusStrokeColorMap = getColorMap(locationStatusStyle, 'stroke');

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
	}) satisfies CircleLayerSpecification;

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
	}) satisfies SymbolLayerSpecification;

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
	}) satisfies CircleLayerSpecification;

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
	}) satisfies CircleLayerSpecification;

// Icon symbols for individual points based on category
// TODO: this is still under development
const getPointsIconLayerStyle = (identifiers: StyleIdentifiers, spritesPrefix = 'custom') =>
	({
		...identifiers,
		type: 'symbol',
		filter: ['!', ['has', 'point_count']],
		layout: {
			'icon-image': [
				'concat',
				spritesPrefix,
				':',
				[
					'case',
					['has', 'category'],
					['get', 'category'],
					'unknown', // fallback if no category
				],
			],
			'icon-size': [
				'interpolate',
				['linear'],
				['zoom'],
				0, // Zoom level
				0.2, // Size
				8,
				0.3,
				12,
				0.4,
				15,
				0.5,
				18,
				1,
			],
			'icon-allow-overlap': true,
			'icon-ignore-placement': false,
		},
		paint: {
			'icon-opacity': 1,
			'icon-color': [
				'case',
				['boolean', ['feature-state', 'selected'], false],
				'#ffffff',
				'#cccccc',
			],
		},
	}) satisfies SymbolLayerSpecification;

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
	}) satisfies LineLayerSpecification;

export const layerStyles = {
	[MapLayerIdEnum.Clusters]: getClusterCircleLayerStyle({
		id: MapLayerIdEnum.Clusters,
		source: MapSourceIdEnum.PointCollection,
	}),
	[MapLayerIdEnum.ClustersLabel]: getClusterSymbolLayerStyle({
		id: MapLayerIdEnum.ClustersLabel,
		source: MapSourceIdEnum.PointCollection,
	}),
	[MapLayerIdEnum.Points]: getPointsLayerStyle({
		id: MapLayerIdEnum.Points,
		source: MapSourceIdEnum.PointCollection,
	}),
	[MapLayerIdEnum.PointsTarget]: getPointsTargetLayerStyle({
		id: MapLayerIdEnum.PointsTarget,
		source: MapSourceIdEnum.PointCollection,
	}),
	[MapLayerIdEnum.PointsIcon]: getPointsIconLayerStyle({
		id: MapLayerIdEnum.PointsIcon,
		source: MapSourceIdEnum.PointCollection,
	}),
	[MapLayerIdEnum.LineString]: getLineStringStyle({
		id: MapLayerIdEnum.LineString,
		source: MapSourceIdEnum.LineStringCollection,
	}),
} satisfies Record<MapLayerId, LayerSpecification>;
