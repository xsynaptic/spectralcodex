import type { MapScopeRow, MapSourceItem } from '@spectralcodex/map-codec';

import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import { createSearchIndex, searchMap } from '#search/search-factory.ts';

function makeRow(
	id: string,
	title: string,
	properties: Partial<MapSourceItem['properties']> = {},
): MapSourceItem {
	return {
		geometry: { coordinates: [120, 23], type: GeometryTypeEnum.Point },
		properties: {
			category: LocationCategoryEnum.Unknown,
			entryQuality: 1,
			hasImage: false,
			id,
			precision: 3,
			rating: 1,
			status: LocationStatusEnum.Abandoned,
			title,
			url: `/${id}/`,
			...properties,
		},
		type: 'Feature',
	};
}

function makeScope(id: string, title: string, row: Partial<MapScopeRow> = {}): MapScopeRow {
	return { count: 1, id, kind: 'region', title, url: `/regions/${id}/`, ...row };
}

function getTitles(rows: Array<MapSourceItem>, scopes: Array<MapScopeRow>, query: string) {
	return searchMap(createSearchIndex(rows, scopes), query).map(({ title }) => title.text);
}

describe('searchMap', () => {
	test('a query matches across case, marks, đ and apostrophes', () => {
		const rows = [makeRow('da-nang', 'Đà Nẵng'), makeRow('ohare', "O'Hare")];

		expect(getTitles(rows, [], 'DA NANG')).toEqual(['Đà Nẵng']);
		expect(getTitles(rows, [], 'ohare')).toEqual(["O'Hare"]);
	});

	test('Thai marks are letters, not diacritics', () => {
		const rows = [makeRow('di', 'ดี'), makeRow('du', 'ดุ')];

		expect(getTitles(rows, [], 'ดี')).toEqual(['ดี']);
	});

	test('a title that starts with the query leads one with a word that does, whatever their weight', () => {
		const rows = [
			makeRow('a', 'Old Salt Field', { rating: 5 }),
			makeRow('b', 'Salt Museum'),
			makeRow('c', 'Saltworks', { rating: 3 }),
		];

		expect(getTitles(rows, [], 'salt')).toEqual(['Saltworks', 'Salt Museum', 'Old Salt Field']);
		expect(getTitles(rows, [], 'works')).toEqual(['Saltworks']);
	});

	test('a Scope row leads the Locations of its tier, and each kind ranks by its own weight', () => {
		const rows = [
			makeRow('stub', 'Tainan Stub', { entryQuality: 1, rating: 5 }),
			makeRow('written', 'Tainan Theater', { entryQuality: 5, rating: 2 }),
		];
		const scopes = [
			makeScope('tainan', 'Tainan', { count: 40 }),
			makeScope('tainan-old', 'Tainan Old Town', { count: 90 }),
		];

		expect(getTitles(rows, scopes, 'tainan')).toEqual([
			'Tainan Old Town',
			'Tainan',
			'Tainan Theater',
			'Tainan Stub',
		]);
	});

	test('a Location with several Points is one row', () => {
		const rows = [
			makeRow('salt-0', 'Budai Saltworks', { url: '/budai-saltworks/' }),
			makeRow('salt-1', 'Budai Saltworks', { url: '/budai-saltworks/' }),
		];

		expect(getTitles(rows, [], 'budai')).toEqual(['Budai Saltworks']);
	});

	test('a Multilingual Title is its own field, highlighted in its own text', () => {
		const [result] = searchMap(
			createSearchIndex([makeRow('temple', 'Temple', { titleMultilingual: '臺南孔廟' })], []),
			'孔廟',
		);

		expect(result?.title).toEqual({ text: 'Temple' });
		expect(result?.titleMultilingual).toEqual({ match: [2, 4], text: '臺南孔廟' });
	});

	test('a Multilingual Title in Latin script stays its own field', () => {
		const [result] = searchMap(
			createSearchIndex(
				[makeRow('citadel', 'Hue Citadel (North Gate)', { titleMultilingual: 'Kinh thanh Hue' })],
				[],
			),
			'kinh',
		);

		expect(result?.title).toEqual({ text: 'Hue Citadel (North Gate)' });
		expect(result?.titleMultilingual).toEqual({ match: [0, 4], text: 'Kinh thanh Hue' });
	});

	test('a highlight covers the written characters a folded match came from', () => {
		const [result] = searchMap(createSearchIndex([makeRow('hoi-an', 'Hội An')], []), 'hoi');

		expect(result?.title.match).toEqual([0, 3]);
	});

	test('a match on a Scope slug alone ranks as a mid-word match', () => {
		const rows = [makeRow('a', 'Ancient Cityscape')];
		const scopes = [makeScope('city-god', 'Chenghuang Temples')];

		expect(getTitles(rows, scopes, 'city')).toEqual(['Ancient Cityscape', 'Chenghuang Temples']);
	});

	test('a Location names the first of its Regions the Scope list knows', () => {
		const rows = [makeRow('a', 'Fort Zeelandia', { regionOrdinals: [99, 7] })];
		const scopes = [makeScope('anping', 'Anping', { ordinal: 7 })];

		expect(searchMap(createSearchIndex(rows, scopes), 'fort')[0]).toMatchObject({
			kind: 'location',
			parentTitle: 'Anping',
			pointId: 'a',
		});
	});

	test('a blank query lists nothing, and a long list stops at fifty rows', () => {
		const rows = Array.from({ length: 60 }, (_, index) => makeRow(`row-${String(index)}`, 'Mill'));
		const index = createSearchIndex(rows, []);

		expect(searchMap(index, ' '.repeat(3))).toEqual([]);
		expect(searchMap(index, 'mill')).toHaveLength(50);
	});
});
