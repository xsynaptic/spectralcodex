import { fc, test } from '@fast-check/vitest';
import { GeometryTypeEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect } from 'vitest';

import type { MapFeaturesRule } from '#map-rules.ts';
import type { MapSourceItem } from '#schemas/codec.ts';

import { createRuleTest, selectMapRows } from '#map-rules.ts';

function makeRow(properties: Partial<MapSourceItem['properties']>): MapSourceItem {
	return {
		geometry: { coordinates: [0, 0], type: GeometryTypeEnum.Point },
		properties: {
			entryQuality: 1,
			hasImage: false,
			id: 'location-id',
			precision: 3,
			rating: 3,
			status: LocationStatusEnum.Abandoned,
			title: 'Location',
			...properties,
		},
		type: 'Feature',
	};
}

function getIds(rows: Array<MapSourceItem>) {
	return rows.map(({ properties }) => properties.id);
}

const ordinalArbitrary = fc.integer({ max: 30, min: 0 });

// Ends past every ordinal, fractional and inverted, as well as the ordinals themselves
const boundArbitrary = fc.oneof(
	fc.integer({ max: 35, min: -5 }),
	fc.double({ noNaN: true }),
	fc.constantFrom(-Infinity, Infinity),
);

const rowsArbitrary = fc
	.array(
		fc.record({
			regionOrdinals: fc.option(fc.array(ordinalArbitrary, { maxLength: 4 })),
			themeIndices: fc.option(fc.array(fc.integer({ max: 5, min: 0 }), { maxLength: 3 })),
		}),
		{ maxLength: 40 },
	)
	.map((columns) =>
		columns.map(({ regionOrdinals, themeIndices }, position) =>
			makeRow({
				id: `location-${String(position)}`,
				...(regionOrdinals === null ? {} : { regionOrdinals }),
				...(themeIndices === null ? {} : { themeIndices }),
			}),
		),
	);

function selectByFilter(rows: ReadonlyArray<MapSourceItem>, rule: MapFeaturesRule) {
	const isInRule = createRuleTest(rule);

	return rows.filter(({ properties }) => isInRule(properties));
}

describe('selectMapRows', () => {
	const inside = makeRow({ id: 'inside', regionOrdinals: [5], themeIndices: [2] });
	const outside = makeRow({ id: 'outside', regionOrdinals: [99], themeIndices: [7] });

	test('theme rule keeps only rows carrying the theme index', () => {
		expect(getIds(selectMapRows([inside, outside], { index: 2, type: 'theme' }))).toEqual([
			'inside',
		]);
		expect(selectMapRows([inside, outside], { index: 99, type: 'theme' })).toEqual([]);
	});

	test('ids rule preserves the list order and drops ids missing from the rows', () => {
		expect(
			getIds(selectMapRows([inside, outside], { ids: ['outside', 'nope', 'inside'], type: 'ids' })),
		).toEqual(['outside', 'inside']);
	});

	test('region rule is inclusive at both ends of the interval', () => {
		const rows = [
			makeRow({ id: 'below-left', regionOrdinals: [3] }),
			makeRow({ id: 'at-left', regionOrdinals: [4] }),
			makeRow({ id: 'at-right', regionOrdinals: [10] }),
			makeRow({ id: 'above-right', regionOrdinals: [11] }),
		];

		expect(getIds(selectMapRows(rows, { interval: [4, 10], type: 'region' }))).toEqual([
			'at-left',
			'at-right',
		]);
	});

	test('rows missing the relevant column are excluded by a rule', () => {
		const bare = makeRow({ id: 'bare' });

		expect(selectMapRows([bare], { interval: [1, 10], type: 'region' })).toHaveLength(0);
		expect(selectMapRows([bare], { index: 2, type: 'theme' })).toHaveLength(0);
	});
});

describe('selectMapRows index matches the linear filter', () => {
	test.prop([rowsArbitrary, fc.tuple(boundArbitrary, boundArbitrary)])(
		'for any interval',
		(rows, interval) => {
			const rule = { interval, type: 'region' } as const;

			expect(getIds(selectMapRows(rows, rule))).toEqual(getIds(selectByFilter(rows, rule)));
		},
	);

	test.prop([rowsArbitrary, fc.integer({ max: 6, min: -1 })])('for any theme', (rows, index) => {
		const rule = { index, type: 'theme' } as const;

		expect(getIds(selectMapRows(rows, rule))).toEqual(getIds(selectByFilter(rows, rule)));
	});
});

describe('selectMapRows edge cases', () => {
	test('a row matching on several ordinals or a repeated theme appears once', () => {
		const row = makeRow({ id: 'repeat', regionOrdinals: [3, 4, 4], themeIndices: [2, 2] });
		const straddling = makeRow({ id: 'straddling', regionOrdinals: [99, 5] });

		expect(getIds(selectMapRows([row], { interval: [1, 10], type: 'region' }))).toEqual(['repeat']);
		expect(getIds(selectMapRows([row], { index: 2, type: 'theme' }))).toEqual(['repeat']);
		expect(getIds(selectMapRows([straddling], { interval: [1, 10], type: 'region' }))).toEqual([
			'straddling',
		]);
	});

	test('a result can be mutated without touching the next selection', () => {
		const rows = [makeRow({ id: 'themed', themeIndices: [2] })];

		selectMapRows(rows, { index: 2, type: 'theme' }).pop();

		expect(getIds(selectMapRows(rows, { index: 2, type: 'theme' }))).toEqual(['themed']);
	});
});
