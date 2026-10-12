import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type {
	MapClickInput,
	MapHoverInput,
	MapSelectionInput,
} from '#canvas/canvas-events-factory.ts';

import {
	decideClickActions,
	decideHoverIntent,
	getSelectionOutcome,
	getSettledClick,
} from '#canvas/canvas-events-factory.ts';
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

describe('getSelectionOutcome', () => {
	const hosted: MapSelectionInput = {
		isHosted: true,
		isLoading: false,
		isTarget: false,
		url: '/some-location/',
	};

	test('a map with no host always opens a popup', () => {
		expect(getSelectionOutcome({ ...hosted, isHosted: false })).toBe('popup');
		expect(getSelectionOutcome({ ...hosted, isHosted: false, isLoading: true })).toBe('popup');
		expect(getSelectionOutcome({ ...hosted, isHosted: false, url: undefined })).toBe('popup');
	});

	test('a hosted map opens the page of a Feature that has one', () => {
		expect(getSelectionOutcome(hosted)).toBe('open');
	});

	test('a hosted map decides nothing while the url is still loading', () => {
		expect(getSelectionOutcome({ ...hosted, isLoading: true, url: undefined })).toBe('pending');
		expect(getSelectionOutcome({ ...hosted, isLoading: true })).toBe('pending');
	});

	test('a hosted Feature with no page falls back to its popup once loaded', () => {
		expect(getSelectionOutcome({ ...hosted, url: undefined })).toBe('popup');
	});

	test('a hosted Target gets its popup at once, loaded or not', () => {
		expect(getSelectionOutcome({ ...hosted, isTarget: true })).toBe('popup');
		expect(
			getSelectionOutcome({ ...hosted, isLoading: true, isTarget: true, url: undefined }),
		).toBe('popup');
	});
});

describe('getSettledClick', () => {
	const click = { clickedId: 'a', isLoading: false, selectedId: 'a' };

	test('a click waits for the popup data before it settles', () => {
		expect(getSettledClick({ ...click, isLoading: true, outcome: 'pending' })).toBeUndefined();
		expect(getSettledClick({ ...click, isLoading: true, outcome: 'popup' })).toBeUndefined();
	});

	test('a click settles as the outcome of the Feature it was made on', () => {
		expect(getSettledClick({ ...click, outcome: 'open' })).toBe('open');
		expect(getSettledClick({ ...click, outcome: 'popup' })).toBe('popup');
	});

	test('a selection nobody clicked opens nothing, whatever its outcome becomes', () => {
		expect(getSettledClick({ ...click, clickedId: undefined, outcome: 'open' })).toBeUndefined();
	});

	test('a click on one Feature never opens another', () => {
		expect(getSettledClick({ ...click, clickedId: 'b', outcome: 'open' })).toBeUndefined();
	});

	test('a click with no selection left settles nothing', () => {
		expect(
			getSettledClick({ ...click, outcome: undefined, selectedId: undefined }),
		).toBeUndefined();
	});

	test('a Target click is spent on its popup, so the same Point opens nothing once it stops being a Target', () => {
		const selection = { isHosted: true, isLoading: false, url: '/some-location/' };
		const asTarget = getSelectionOutcome({ ...selection, isTarget: true });
		const afterPageChange = getSelectionOutcome({ ...selection, isTarget: false });

		expect(getSettledClick({ ...click, outcome: asTarget })).toBe('popup');
		expect(afterPageChange).toBe('open');
		expect(
			getSettledClick({ ...click, clickedId: undefined, outcome: afterPageChange }),
		).toBeUndefined();
	});
});
