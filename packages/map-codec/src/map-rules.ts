import * as R from 'remeda';

import type { MapSourceItem } from '#schemas/codec.ts';

export type MapInterval = [number, number];

export type MapFeaturesRule =
	| { ids: Array<string>; type: 'ids' }
	| { index: number; type: 'theme' }
	| { interval: MapInterval; type: 'region' };

const rowByIdCache = new WeakMap<ReadonlyArray<MapSourceItem>, Map<string, MapSourceItem>>();

function getRowById(rows: ReadonlyArray<MapSourceItem>) {
	const cached = rowByIdCache.get(rows);

	if (cached) return cached;

	const rowById = new Map(rows.map((row) => [row.properties.id, row] as const));

	rowByIdCache.set(rows, rowById);

	return rowById;
}

interface RegionIndex {
	ordinals: Array<number>;
	positions: Array<number>;
}

const regionIndexCache = new WeakMap<ReadonlyArray<MapSourceItem>, RegionIndex>();

function getRegionIndex(rows: ReadonlyArray<MapSourceItem>) {
	const cached = regionIndexCache.get(rows);

	if (cached) return cached;

	const pairs: Array<[ordinal: number, position: number]> = [];

	for (const [position, row] of rows.entries()) {
		const ordinals = row.properties.regionOrdinals ?? [];

		for (const ordinal of ordinals) {
			pairs.push([ordinal, position]);
		}
	}

	pairs.sort(([ordinalA], [ordinalB]) => ordinalA - ordinalB);

	const regionIndex = {
		ordinals: pairs.map(([ordinal]) => ordinal),
		positions: pairs.map(([, position]) => position),
	};

	regionIndexCache.set(rows, regionIndex);

	return regionIndex;
}

function selectRegionRows(rows: ReadonlyArray<MapSourceItem>, [left, right]: MapInterval) {
	const { ordinals, positions } = getRegionIndex(rows);
	const matched: Array<number> = [];

	for (
		let pairIndex = R.sortedIndex(ordinals, left);
		pairIndex < ordinals.length && (ordinals[pairIndex] ?? Infinity) <= right;
		pairIndex++
	) {
		const position = positions[pairIndex];

		if (position !== undefined) matched.push(position);
	}

	matched.sort((positionA, positionB) => positionA - positionB);

	const selected: Array<MapSourceItem> = [];
	let previous: number | undefined;

	for (const position of matched) {
		const row = rows[position];

		if (position === previous || !row) continue;

		selected.push(row);
		previous = position;
	}

	return selected;
}

const rowsByThemeCache = new WeakMap<
	ReadonlyArray<MapSourceItem>,
	Map<number, Array<MapSourceItem>>
>();

function getRowsByTheme(rows: ReadonlyArray<MapSourceItem>) {
	const cached = rowsByThemeCache.get(rows);

	if (cached) return cached;

	const rowsByTheme = new Map<number, Array<MapSourceItem>>();

	for (const row of rows) {
		const indices = new Set(row.properties.themeIndices);

		for (const index of indices) {
			const themeRows = rowsByTheme.get(index);

			if (themeRows) {
				themeRows.push(row);
			} else {
				rowsByTheme.set(index, [row]);
			}
		}
	}

	rowsByThemeCache.set(rows, rowsByTheme);

	return rowsByTheme;
}

export function getMapRowById(rows: ReadonlyArray<MapSourceItem>, id: string) {
	return getRowById(rows).get(id);
}

export function createRuleTest(
	rule: MapFeaturesRule,
): (properties: MapSourceItem['properties']) => boolean {
	switch (rule.type) {
		case 'ids': {
			const idSet = new Set(rule.ids);

			return (properties) => idSet.has(properties.id);
		}
		case 'region': {
			const [left, right] = rule.interval;

			return (properties) =>
				properties.regionOrdinals?.some((ordinal) => ordinal >= left && ordinal <= right) ?? false;
		}
		case 'theme': {
			return (properties) => properties.themeIndices?.includes(rule.index) ?? false;
		}
	}
}

export function selectMapRows(
	rows: ReadonlyArray<MapSourceItem>,
	rule: MapFeaturesRule,
): Array<MapSourceItem> {
	switch (rule.type) {
		case 'ids': {
			const rowById = getRowById(rows);

			return rule.ids.map((id) => rowById.get(id)).filter((row) => row !== undefined);
		}
		case 'region': {
			return selectRegionRows(rows, rule.interval);
		}
		case 'theme': {
			return [...(getRowsByTheme(rows).get(rule.index) ?? [])];
		}
	}
}
