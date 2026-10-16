import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapCanvasClickInput, MapHoverInput } from '#canvas/canvas-events-factory.ts';

import { decideHoverIntent, getCanvasClickHit } from '#canvas/canvas-events-factory.ts';
import { MapLayerIdEnum } from '#source/source-config.ts';

function makeClickInput(input: Partial<MapCanvasClickInput> = {}): MapCanvasClickInput {
	return {
		clusterId: undefined,
		coordinates: [100, 15],
		geometryType: GeometryTypeEnum.Point,
		layerId: MapLayerIdEnum.Points,
		pointId: 'location-id',
		...input,
	};
}

function makeHoverInput(input: Partial<MapHoverInput> = {}): MapHoverInput {
	return {
		clusterId: undefined,
		featureId: 'location-id',
		hoveredFeatureId: undefined,
		layerId: MapLayerIdEnum.Points,
		pointId: 'location-id',
		storeHoveredId: undefined,
		...input,
	};
}

describe('getCanvasClickHit', () => {
	const empty = { kind: 'empty' };

	test('nothing clicked, or a feature that is not a Point, is the empty map', () => {
		expect(
			getCanvasClickHit({
				clusterId: undefined,
				coordinates: undefined,
				geometryType: undefined,
				layerId: undefined,
				pointId: undefined,
			}),
		).toEqual(empty);
		expect(
			getCanvasClickHit(
				makeClickInput({ geometryType: 'Polygon', layerId: MapLayerIdEnum.DivisionMask }),
			),
		).toEqual(empty);
	});

	test.each([42, '42'])('a cluster with id %j is a cluster hit', (clusterId) => {
		expect(
			getCanvasClickHit(makeClickInput({ clusterId, layerId: MapLayerIdEnum.Clusters })),
		).toEqual({ center: [100, 15], clusterId, kind: 'cluster' });
	});

	test.each([
		['a zero id', { clusterId: 0 }],
		['no usable id', { clusterId: {} }],
		['malformed coordinates', { clusterId: 42, coordinates: [100] }],
	])('a cluster with %s is the empty map', (_, input) => {
		expect(
			getCanvasClickHit(makeClickInput({ ...input, layerId: MapLayerIdEnum.Clusters })),
		).toEqual(empty);
	});

	test.each([MapLayerIdEnum.Points, MapLayerIdEnum.PointsTarget, MapLayerIdEnum.PointsImage])(
		'a Point on the %s layer is a Point hit, never a pick',
		(layerId) => {
			expect(getCanvasClickHit(makeClickInput({ layerId }))).toEqual({
				isPick: false,
				kind: 'point',
				pointId: 'location-id',
			});
		},
	);

	test('a Point with a non-string id, or on an unhandled layer, is the empty map', () => {
		expect(getCanvasClickHit(makeClickInput({ pointId: 7 }))).toEqual(empty);
		expect(getCanvasClickHit(makeClickInput({ layerId: MapLayerIdEnum.PointsLabel }))).toEqual(
			empty,
		);
	});
});

describe('decideHoverIntent over a feature', () => {
	test('sets hover state on a newly hovered point', () => {
		expect(decideHoverIntent(makeHoverInput())).toEqual({
			cursor: 'pointer',
			featureStateChanges: [{ featureId: 'location-id', hover: true }],
			hoveredFeatureId: 'location-id',
			storeHoveredIdUpdate: { hoveredId: 'location-id' },
		});
	});

	test('clears the previously hovered feature when hover moves to another point', () => {
		expect(
			decideHoverIntent(
				makeHoverInput({ hoveredFeatureId: 'other-id', storeHoveredId: 'other-id' }),
			),
		).toEqual({
			cursor: 'pointer',
			featureStateChanges: [
				{ featureId: 'other-id', hover: false },
				{ featureId: 'location-id', hover: true },
			],
			hoveredFeatureId: 'location-id',
			storeHoveredIdUpdate: { hoveredId: 'location-id' },
		});
	});

	test('writes no feature state or store update while hover stays on the same point', () => {
		expect(
			decideHoverIntent(
				makeHoverInput({ hoveredFeatureId: 'location-id', storeHoveredId: 'location-id' }),
			),
		).toEqual({
			cursor: 'pointer',
			featureStateChanges: [],
			hoveredFeatureId: 'location-id',
			storeHoveredIdUpdate: undefined,
		});
	});

	test('leaves the store untouched when a hovered point has a non-string id', () => {
		expect(
			decideHoverIntent(makeHoverInput({ pointId: undefined, storeHoveredId: 'stale-id' })),
		).toEqual({
			cursor: 'pointer',
			featureStateChanges: [{ featureId: 'location-id', hover: true }],
			hoveredFeatureId: 'location-id',
			storeHoveredIdUpdate: undefined,
		});
	});

	test('prefixes the store id when hovering a cluster', () => {
		expect(
			decideHoverIntent(
				makeHoverInput({
					clusterId: 42,
					featureId: 42,
					layerId: MapLayerIdEnum.Clusters,
				}),
			),
		).toEqual({
			cursor: 'zoom-in',
			featureStateChanges: [{ featureId: 42, hover: true }],
			hoveredFeatureId: 42,
			storeHoveredIdUpdate: { hoveredId: 'cluster-42' },
		});
	});

	test('leaves the store untouched when a hovered cluster has a non-numeric id', () => {
		expect(
			decideHoverIntent(
				makeHoverInput({
					clusterId: '42',
					featureId: 42,
					layerId: MapLayerIdEnum.Clusters,
					storeHoveredId: 'stale-id',
				}),
			),
		).toEqual({
			cursor: 'zoom-in',
			featureStateChanges: [{ featureId: 42, hover: true }],
			hoveredFeatureId: 42,
			storeHoveredIdUpdate: undefined,
		});
	});
});

describe('decideHoverIntent clearing hover', () => {
	test('clears hover when nothing is under the cursor', () => {
		expect(
			decideHoverIntent(
				makeHoverInput({
					featureId: undefined,
					hoveredFeatureId: 'location-id',
					layerId: undefined,
					pointId: undefined,
					storeHoveredId: 'location-id',
				}),
			),
		).toEqual({
			cursor: '',
			featureStateChanges: [{ featureId: 'location-id', hover: false }],
			hoveredFeatureId: undefined,
			storeHoveredIdUpdate: { hoveredId: undefined },
		});
	});

	test('clears hover on an unhandled layer', () => {
		expect(
			decideHoverIntent(
				makeHoverInput({
					featureId: undefined,
					hoveredFeatureId: 'location-id',
					layerId: MapLayerIdEnum.DivisionMask,
					pointId: undefined,
					storeHoveredId: 'location-id',
				}),
			),
		).toEqual({
			cursor: '',
			featureStateChanges: [{ featureId: 'location-id', hover: false }],
			hoveredFeatureId: undefined,
			storeHoveredIdUpdate: { hoveredId: undefined },
		});
	});

	test('writes nothing when the cursor is over empty canvas and hover is already clear', () => {
		expect(
			decideHoverIntent(
				makeHoverInput({ featureId: undefined, layerId: undefined, pointId: undefined }),
			),
		).toEqual({
			cursor: '',
			featureStateChanges: [],
			hoveredFeatureId: undefined,
			storeHoveredIdUpdate: undefined,
		});
	});
});
