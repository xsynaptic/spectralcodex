import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapClickInput, MapHoverInput } from '#canvas/canvas-events-factory.ts';

import { decideClickActions, decideHoverIntent } from '#canvas/canvas-events-factory.ts';
import { MapLayerIdEnum } from '#source/source-config.ts';

function makeClickInput(input: Partial<MapClickInput> = {}): MapClickInput {
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

describe('decideClickActions', () => {
	test('clears the selection when nothing was clicked', () => {
		expect(
			decideClickActions({
				clusterId: undefined,
				coordinates: undefined,
				geometryType: undefined,
				layerId: undefined,
				pointId: undefined,
			}),
		).toEqual([{ kind: 'clear-selection' }]);
	});

	test('clears the selection when the clicked feature is not a point', () => {
		expect(
			decideClickActions(
				makeClickInput({
					geometryType: GeometryTypeEnum.Polygon,
					layerId: MapLayerIdEnum.Polygon,
				}),
			),
		).toEqual([{ kind: 'clear-selection' }]);
	});

	test('expands a cluster', () => {
		expect(
			decideClickActions(
				makeClickInput({
					clusterId: 42,
					coordinates: [100, 15],
					layerId: MapLayerIdEnum.Clusters,
				}),
			),
		).toEqual([
			{ kind: 'close-filter' },
			{ center: [100, 15], clusterId: 42, kind: 'expand-cluster' },
		]);
	});

	test('expands a cluster identified by a string id', () => {
		expect(
			decideClickActions(makeClickInput({ clusterId: '42', layerId: MapLayerIdEnum.Clusters })),
		).toEqual([
			{ kind: 'close-filter' },
			{ center: [100, 15], clusterId: '42', kind: 'expand-cluster' },
		]);
	});

	test('treats a zero cluster id as absent', () => {
		expect(
			decideClickActions(makeClickInput({ clusterId: 0, layerId: MapLayerIdEnum.Clusters })),
		).toEqual([{ kind: 'close-filter' }]);
	});

	test('closes the filter only when a cluster has no usable id', () => {
		expect(
			decideClickActions(makeClickInput({ clusterId: {}, layerId: MapLayerIdEnum.Clusters })),
		).toEqual([{ kind: 'close-filter' }]);
	});

	test('closes the filter only when a cluster has malformed coordinates', () => {
		expect(
			decideClickActions(
				makeClickInput({
					clusterId: 42,
					coordinates: [100],
					layerId: MapLayerIdEnum.Clusters,
				}),
			),
		).toEqual([{ kind: 'close-filter' }]);
	});

	test.each([MapLayerIdEnum.Points, MapLayerIdEnum.PointsTarget, MapLayerIdEnum.PointsImage])(
		'selects a point clicked on the %s layer',
		(layerId) => {
			expect(decideClickActions(makeClickInput({ layerId }))).toEqual([
				{ kind: 'close-filter' },
				{ center: [100, 15], kind: 'select-point', pointId: 'location-id' },
			]);
		},
	);

	test('selects a point without a center when coordinates are malformed', () => {
		expect(decideClickActions(makeClickInput({ coordinates: ['100', 15] }))).toEqual([
			{ kind: 'close-filter' },
			{ center: undefined, kind: 'select-point', pointId: 'location-id' },
		]);
	});

	test('closes the filter only when a point has a non-string id', () => {
		expect(decideClickActions(makeClickInput({ pointId: 7 }))).toEqual([{ kind: 'close-filter' }]);
	});

	test('closes the filter only for a point on an unhandled layer', () => {
		expect(decideClickActions(makeClickInput({ layerId: MapLayerIdEnum.PointsLabel }))).toEqual([
			{ kind: 'close-filter' },
		]);
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
			cursor: 'grab',
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
					layerId: MapLayerIdEnum.Polygon,
					pointId: undefined,
					storeHoveredId: 'location-id',
				}),
			),
		).toEqual({
			cursor: 'grab',
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
			cursor: 'grab',
			featureStateChanges: [],
			hoveredFeatureId: undefined,
			storeHoveredIdUpdate: undefined,
		});
	});
});
