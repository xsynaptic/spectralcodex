import { GeometryTypeEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapSourceItem } from '#codec.ts';
import type { MapFeaturesRule, MapInterval } from '#map-rules.ts';

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

function createRandom(seed: number) {
	let state = seed;

	return function random() {
		state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;

		return state / 4_294_967_296;
	};
}

function pick<T>(random: () => number, items: ReadonlyArray<T>): T {
	const item = items[Math.floor(random() * items.length)];

	if (item === undefined) throw new Error('Cannot pick from an empty list');

	return item;
}

function createRegionIntervals(random: () => number, regionCount: number) {
	const children = new Map<number, Array<number>>();

	for (let region = 1; region < regionCount; region++) {
		const parent = Math.floor(random() * region);

		children.set(parent, [...(children.get(parent) ?? []), region]);
	}

	const intervals: Array<MapInterval> = [];
	let counter = 1;

	function visit(region: number) {
		const left = counter;
		const regionChildren = children.get(region) ?? [];

		counter += 1;
		for (const child of regionChildren) visit(child);
		intervals.push([left, counter]);
		counter += 1;
	}

	visit(0);

	return intervals;
}

function createDirectory(seed: number) {
	const random = createRandom(seed);
	const intervals = createRegionIntervals(random, 300);
	const ordinals = intervals.map(([left]) => left);
	const themeCount = 40;

	const rows = Array.from({ length: 2000 }, (_, position) => {
		const regionOrdinals = Array.from({ length: Math.floor(random() * 4) }, () =>
			pick(random, ordinals),
		);
		const themeIndices = Array.from({ length: Math.floor(random() * 3) }, () =>
			Math.floor(random() * themeCount),
		);

		return makeRow({
			id: `location-${String(position)}`,
			...(regionOrdinals.length > 0 ? { regionOrdinals } : {}),
			...(themeIndices.length > 0 ? { themeIndices } : {}),
		});
	});

	return { intervals, rows, themeCount };
}

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

	test('a row in several regions is kept when any one ordinal is inside', () => {
		const row = makeRow({ id: 'multi', regionOrdinals: [99, 5] });

		expect(selectMapRows([row], { interval: [1, 10], type: 'region' })).toHaveLength(1);
	});

	test('rows missing the relevant column are excluded by a rule', () => {
		const bare = makeRow({ id: 'bare' });

		expect(selectMapRows([bare], { interval: [1, 10], type: 'region' })).toHaveLength(0);
		expect(selectMapRows([bare], { index: 2, type: 'theme' })).toHaveLength(0);
	});
});

describe('selectMapRows index matches the linear filter', () => {
	const { intervals, rows, themeCount } = createDirectory(20_261_017);

	test('for every region in the tree', () => {
		for (const interval of intervals) {
			const rule = { interval, type: 'region' } as const;

			expect(getIds(selectMapRows(rows, rule))).toEqual(getIds(selectByFilter(rows, rule)));
		}
	});

	test('for every theme', () => {
		for (let index = 0; index < themeCount; index++) {
			const rule = { index, type: 'theme' } as const;

			expect(getIds(selectMapRows(rows, rule))).toEqual(getIds(selectByFilter(rows, rule)));
		}
	});

	test('for intervals that do not line up with a region', () => {
		const cases: Array<MapInterval> = [
			[0, 0],
			[-5, 3],
			[7, 7],
			[10, 4],
			[2.5, 40.5],
			[-Infinity, Infinity],
		];

		for (const interval of cases) {
			const rule = { interval, type: 'region' } as const;

			expect(getIds(selectMapRows(rows, rule))).toEqual(getIds(selectByFilter(rows, rule)));
		}
	});

	test('rows without ordinals or themes are never selected', () => {
		const bareIds = new Set(
			rows
				.filter(({ properties }) => !properties.regionOrdinals && !properties.themeIndices)
				.map(({ properties }) => properties.id),
		);
		const selected = [
			...selectMapRows(rows, { interval: [-Infinity, Infinity], type: 'region' }),
			...Array.from({ length: themeCount }, (_, index) =>
				selectMapRows(rows, { index, type: 'theme' }),
			).flat(),
		];

		expect(bareIds.size).toBeGreaterThan(0);
		expect(selected.filter(({ properties }) => bareIds.has(properties.id))).toEqual([]);
	});
});

describe('selectMapRows edge cases', () => {
	test('an empty interval selects nothing', () => {
		const row = makeRow({ regionOrdinals: [5] });

		expect(selectMapRows([row], { interval: [6, 5], type: 'region' })).toEqual([]);
	});

	test('an unknown theme selects nothing', () => {
		const row = makeRow({ themeIndices: [2] });

		expect(selectMapRows([row], { index: 99, type: 'theme' })).toEqual([]);
	});

	test('a row matching on several ordinals or a repeated theme appears once', () => {
		const row = makeRow({ id: 'repeat', regionOrdinals: [3, 4, 4], themeIndices: [2, 2] });

		expect(getIds(selectMapRows([row], { interval: [1, 10], type: 'region' }))).toEqual(['repeat']);
		expect(getIds(selectMapRows([row], { index: 2, type: 'theme' }))).toEqual(['repeat']);
	});

	test('a result can be mutated without touching the next selection', () => {
		const rows = [makeRow({ id: 'themed', themeIndices: [2] })];

		selectMapRows(rows, { index: 2, type: 'theme' }).pop();

		expect(getIds(selectMapRows(rows, { index: 2, type: 'theme' }))).toEqual(['themed']);
	});
});
