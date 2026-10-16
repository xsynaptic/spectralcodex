import { describe, expect, test } from 'vitest';

import { parseMapView } from '#host/host-view.ts';

describe('parseMapView', () => {
	test('a page with no view yields an empty one', () => {
		expect(parseMapView(undefined)).toEqual({});
		expect(parseMapView('')).toEqual({});
	});

	test('a Location view carries its Targets', () => {
		expect(parseMapView('{"targetIds":["theater","theater-1"]}')).toEqual({
			targetIds: ['theater', 'theater-1'],
		});
	});

	test('a Region view carries a Scope with its rule, bounds and Division', () => {
		const view = {
			scope: {
				apiDivisionUrl: '/api/map/divisions/tainan.json',
				bounds: [120, 22.8, 120.7, 23.5],
				rule: { interval: [12, 48], type: 'region' },
				title: 'Tainan',
				url: '/regions/tainan/',
			},
		};

		expect(parseMapView(JSON.stringify(view))).toEqual(view);
	});

	test('fields the map does not take from a host are dropped', () => {
		expect(parseMapView('{"targetIds":["theater"],"languages":["zh"]}')).toEqual({
			targetIds: ['theater'],
		});
	});

	test('text that is not JSON yields an empty view', () => {
		expect(parseMapView('theater theater-1')).toEqual({});
	});

	test('one malformed field voids the whole view', () => {
		expect(parseMapView('{"targetIds":"theater"}')).toEqual({});
		expect(
			parseMapView(
				'{"targetIds":["theater"],"scope":{"rule":{"type":"region"},"title":"Tainan","url":"/regions/tainan/"}}',
			),
		).toEqual({});
	});
});
