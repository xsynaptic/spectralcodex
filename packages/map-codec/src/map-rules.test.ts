import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapSourceItem } from '#codec.ts';

import { selectMapRows } from '#map-rules.ts';

function makeRow(properties: Partial<MapSourceItem['properties']>): MapSourceItem {
	return {
		geometry: { coordinates: [0, 0], type: GeometryTypeEnum.Point },
		properties: {
			category: LocationCategoryEnum.Unknown,
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
