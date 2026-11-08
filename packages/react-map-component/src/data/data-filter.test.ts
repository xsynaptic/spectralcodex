import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { LocationStatus } from '@spectralcodex/shared/map';

import { fc, test } from '@fast-check/vitest';
import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect } from 'vitest';

import type { MapFilterState } from '#data/data-filter.ts';
import type { MapFeaturesRule } from '#types.ts';

import { getHiddenTargetIds, getMapCanvasData } from '#data/data-filter.ts';
import { makeMapSourceItem } from '#lib/map-test-utils.ts';

const passAll: MapFilterState = {
	objective: 1,
	rating: 1,
	status: [],
};

function getDrawnIds(result: ReturnType<typeof getMapCanvasData>) {
	return result.pointCollection.features.map(({ properties }) => properties.id);
}

function isDrawn(item: MapSourceItem, filter: MapFilterState) {
	return getDrawnIds(getMapCanvasData([item], filter)).includes(item.properties.id);
}

describe('getMapCanvasData visibility', () => {
	test('status is an exclude-list', () => {
		const item = makeMapSourceItem({ status: LocationStatusEnum.Abandoned });

		expect(isDrawn(item, { ...passAll, status: [LocationStatusEnum.Abandoned] })).toBe(false);
		expect(isDrawn(item, { ...passAll, status: [LocationStatusEnum.Active] })).toBe(true);
	});

	test('a missing objective is never hidden by the objective threshold', () => {
		expect(isDrawn(makeMapSourceItem(), { ...passAll, objective: 5 })).toBe(true);
	});

	test('every threshold is an inclusive minimum', () => {
		const atThreshold: MapFilterState = { objective: 3, rating: 3, status: [] };
		const onTheLine = { objective: 3, rating: 3 };

		expect(isDrawn(makeMapSourceItem(onTheLine), atThreshold)).toBe(true);
		expect(isDrawn(makeMapSourceItem({ ...onTheLine, rating: 2 }), atThreshold)).toBe(false);
		expect(isDrawn(makeMapSourceItem({ ...onTheLine, objective: 2 }), atThreshold)).toBe(false);
	});
});

describe('getMapCanvasData', () => {
	test('a hidden item is neither drawn nor counted as filtered', () => {
		const result = getMapCanvasData([makeMapSourceItem({ rating: 1 }), makeMapSourceItem()], {
			...passAll,
			rating: 3,
		});

		expect(result.filteredCount).toBe(1);
		expect(result.totalCount).toBe(2);
	});

	test('a pinned item is drawn whatever the filter hides', () => {
		const result = getMapCanvasData(
			[
				makeMapSourceItem({ id: 'target', rating: 1 }),
				makeMapSourceItem({ id: 'other', rating: 1 }),
			],
			{ ...passAll, pinnedIds: ['target'], rating: 3 },
		);

		expect(getDrawnIds(result)).toEqual(['target']);
	});

	test('a pinned item outside the Scope is drawn but not counted', () => {
		const result = getMapCanvasData(
			[makeMapSourceItem({ id: 'target', themeIndices: [1] })],
			{ ...passAll, pinnedIds: ['target'] },
			{ index: 2, type: 'theme' },
		);

		expect(getDrawnIds(result)).toEqual(['target']);
		expect(result.filteredCount).toBe(0);
		expect(result.totalCount).toBe(0);
	});
});

describe('getHiddenTargetIds', () => {
	const items = [
		makeMapSourceItem({ id: 'hidden', rating: 1 }),
		makeMapSourceItem({ id: 'visible', rating: 5 }),
	];
	const filter = { ...passAll, rating: 3 };

	test('only Targets the filter hides are returned', () => {
		expect(getHiddenTargetIds(items, filter, { targetIds: ['hidden', 'visible'] })).toEqual([
			'hidden',
		]);
		expect(getHiddenTargetIds(items, filter, { targetIds: ['visible'] })).toEqual([]);
	});

	test('a Target outside the Scope is returned even when the filter shows it', () => {
		const scopeRule: MapFeaturesRule = { index: 1, type: 'theme' };

		expect(getHiddenTargetIds(items, filter, { scopeRule, targetIds: ['visible'] })).toEqual([
			'visible',
		]);
	});
});

describe('getMapCanvasData scope', () => {
	const inside = makeMapSourceItem({ id: 'inside', regionOrdinals: [5] });
	const outside = makeMapSourceItem({ id: 'outside', regionOrdinals: [99] });

	const scopeRule: MapFeaturesRule = { interval: [4, 10], type: 'region' };

	test('items outside the Scope are not drawn, and the total is the Scope size', () => {
		const result = getMapCanvasData([inside, outside], passAll, scopeRule);

		expect(getDrawnIds(result)).toEqual(['inside']);
		expect(result.totalCount).toBe(1);
		expect(result.filteredCount).toBe(1);
	});

	test('a filter that empties the Scope leaves a blank map and the Scope size as the total', () => {
		const result = getMapCanvasData(
			[inside, outside],
			{ ...passAll, status: [LocationStatusEnum.Abandoned] },
			scopeRule,
		);

		expect(result.pointCollection.features).toEqual([]);
		expect(result.filteredCount).toBe(0);
		expect(result.totalCount).toBe(1);
	});
});

const pointIds = ['a', 'b', 'c', 'd', 'e', 'f'];
const level = fc.integer({ max: 5, min: 1 });
const ordinal = fc.integer({ max: 6, min: 1 });
const themeIndex = fc.integer({ max: 3, min: 1 });
const statuses = [
	LocationStatusEnum.Abandoned,
	LocationStatusEnum.Active,
	LocationStatusEnum.Converted,
];

interface RowProperties {
	objective: number | undefined;
	rating: number;
	regionOrdinals: Array<number>;
	status: LocationStatus;
	themeIndices: Array<number>;
}

const rowProperties: fc.Arbitrary<RowProperties> = fc.record(
	{
		objective: fc.option(level, { nil: undefined }),
		rating: level,
		regionOrdinals: fc.uniqueArray(ordinal, { maxLength: 2 }),
		status: fc.constantFrom(...statuses),
		themeIndices: fc.uniqueArray(themeIndex, { maxLength: 2 }),
	},
	{ noNullPrototype: true },
);

function makeRow(id: string, { objective, ...properties }: RowProperties) {
	return makeMapSourceItem(
		objective === undefined ? { ...properties, id } : { ...properties, id, objective },
	);
}

const uniqueIdRows = fc
	.uniqueArray(fc.constantFrom(...pointIds), { maxLength: pointIds.length })
	.chain((ids) =>
		fc.tuple(...ids.map((id) => rowProperties.map((properties) => makeRow(id, properties)))),
	);

const mapFilterState = fc.record(
	{ objective: level, rating: level, status: fc.subarray(statuses) },
	{ noNullPrototype: true },
);

const scopeRule = fc.oneof(
	fc.tuple(ordinal, ordinal).map(
		([first, second]) =>
			({
				interval: [Math.min(first, second), Math.max(first, second)],
				type: 'region',
			}) satisfies MapFeaturesRule,
	),
	themeIndex.map((index) => ({ index, type: 'theme' }) satisfies MapFeaturesRule),
);

const pageWithRows = fc.record(
	{
		filter: mapFilterState,
		rows: uniqueIdRows,
		scopeRule: fc.option(scopeRule, { nil: undefined }),
		targetIds: fc.subarray([...pointIds, 'missing']),
	},
	{ noNullPrototype: true },
);

interface DrawnPage {
	filter: MapFilterState;
	rows: ReadonlyArray<MapSourceItem>;
	scopeRule?: MapFeaturesRule | undefined;
	targetIds: ReadonlyArray<string>;
}

function drawPage({ filter, rows, scopeRule, targetIds }: DrawnPage) {
	const pinnedIds = getHiddenTargetIds(rows, filter, { scopeRule, targetIds });

	return getMapCanvasData(
		rows,
		pinnedIds.length > 0 ? { ...filter, pinnedIds } : filter,
		scopeRule,
	);
}

function sortIds(ids: ReadonlyArray<string>) {
	return ids.toSorted((first, second) => first.localeCompare(second));
}

function isInsideScope(properties: MapSourceItem['properties'], rule: MapFeaturesRule | undefined) {
	if (!rule) return true;

	switch (rule.type) {
		case 'ids': {
			return rule.ids.includes(properties.id);
		}
		case 'region': {
			const [left, right] = rule.interval;

			return properties.regionOrdinals?.some((value) => value >= left && value <= right) ?? false;
		}
		case 'theme': {
			return properties.themeIndices?.includes(rule.index) ?? false;
		}
	}
}

function isShownByFilter(properties: MapSourceItem['properties'], filter: MapFilterState) {
	if (filter.status.includes(properties.status)) return false;
	if (properties.rating < filter.rating) return false;

	return properties.objective === undefined || properties.objective >= filter.objective;
}

describe('getMapCanvasData with Targets, a Map Filter and a Scope', () => {
	test.prop([pageWithRows])(
		'every Target is drawn, and anything else drawn is inside the Scope and passes the Map Filter',
		(page) => {
			const expected = page.rows
				.filter(
					({ properties }) =>
						page.targetIds.includes(properties.id) ||
						(isInsideScope(properties, page.scopeRule) && isShownByFilter(properties, page.filter)),
				)
				.map(({ properties }) => properties.id);

			expect(sortIds(getDrawnIds(drawPage(page)))).toEqual(sortIds(expected));
		},
	);

	test.prop([pageWithRows])('the metrics count only Features inside the Scope', (page) => {
		const result = drawPage(page);
		const insideIds = new Set(
			page.rows
				.filter(({ properties }) => isInsideScope(properties, page.scopeRule))
				.map(({ properties }) => properties.id),
		);

		expect(result.totalCount).toBe(insideIds.size);
		expect(result.filteredCount).toBe(getDrawnIds(result).filter((id) => insideIds.has(id)).length);
	});

	test.prop([pageWithRows, scopeRule, rowProperties])(
		'a Target outside the Scope is drawn and changes nothing else',
		({ filter, rows }, rule, targetProperties) => {
			const target = makeRow('target', {
				...targetProperties,
				regionOrdinals: [9],
				themeIndices: [],
			});
			const without = drawPage({ filter, rows, scopeRule: rule, targetIds: [] });
			const result = drawPage({
				filter,
				rows: [...rows, target],
				scopeRule: rule,
				targetIds: ['target'],
			});

			expect(sortIds(getDrawnIds(result))).toEqual(sortIds([...getDrawnIds(without), 'target']));
			expect(result.filteredCount).toBe(without.filteredCount);
			expect(result.totalCount).toBe(without.totalCount);
		},
	);
});
