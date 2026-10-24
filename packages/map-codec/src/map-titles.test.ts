import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapSourceItem } from '#schemas/codec.ts';

import { getMapRowLabel, joinMapTitles } from '#map-titles.ts';

function makeProperties(
	properties: Partial<MapSourceItem['properties']>,
): MapSourceItem['properties'] {
	return {
		entryQuality: 1,
		hasImage: false,
		id: 'location-id',
		precision: 3,
		rating: 3,
		status: LocationStatusEnum.Abandoned,
		title: 'Location',
		...properties,
	};
}

describe('joinMapTitles', () => {
	test('Chinese and Japanese titles join with a full-width colon, others with a colon and space', () => {
		expect(joinMapTitles('Bopiliao', 'North Block')).toBe('Bopiliao: North Block');
		expect(joinMapTitles('剝皮寮', '北街')).toBe('剝皮寮：北街');
		expect(joinMapTitles('サンプル', '北')).toBe('サンプル：北');
		expect(joinMapTitles('ป้อมพระสุเมรุ', 'ประตู')).toBe('ป้อมพระสุเมรุ: ประตู');
		expect(joinMapTitles('Bopiliao', undefined)).toBe('Bopiliao');
	});
});

describe('getMapRowLabel', () => {
	test('a Point reads after its Location in each language', () => {
		expect(
			getMapRowLabel(
				makeProperties({
					pointTitle: 'Octagonal Control Tower',
					pointTitleMultilingual: '八角塔台',
					title: 'Yilan South Airfield',
					titleMultilingual: '宜蘭南飛行場',
				}),
			),
		).toBe('Yilan South Airfield: Octagonal Control Tower (宜蘭南飛行場：八角塔台)');
	});

	test('a missing Multilingual Title drops only what it would have added', () => {
		expect(
			getMapRowLabel(
				makeProperties({
					pointTitle: 'North Block',
					title: 'Bopiliao',
					titleMultilingual: '剝皮寮',
				}),
			),
		).toBe('Bopiliao: North Block (剝皮寮)');
		expect(
			getMapRowLabel(
				makeProperties({
					pointTitle: 'North Block',
					pointTitleMultilingual: '北街',
					title: 'Bopiliao',
				}),
			),
		).toBe('Bopiliao: North Block');
		expect(getMapRowLabel(makeProperties({ title: 'Bopiliao' }))).toBe('Bopiliao');
	});
});
