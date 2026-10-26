import { describe, expect, test } from 'vitest';

import { parseMapView } from '#host/host-view.ts';

describe('parseMapView', () => {
	test('a page with no view yields an empty one', () => {
		expect(parseMapView(undefined)).toEqual({});
		expect(parseMapView('')).toEqual({});
	});

	test('a valid view comes back whole', () => {
		const view = {
			scope: {
				apiDivisionUrl: '/api/map/divisions/tainan.json',
				bounds: [120, 22.8, 120.7, 23.5],
				rule: { interval: [12, 48], type: 'region' },
				title: 'Tainan',
				url: '/regions/tainan/',
			},
			targetIds: ['theater', 'theater-1'],
		};

		expect(parseMapView(JSON.stringify(view))).toEqual(view);
	});

	test('text that is not JSON, or a view with one malformed field, yields an empty view', () => {
		expect(parseMapView('theater theater-1')).toEqual({});
		expect(parseMapView('{"targetIds":"theater"}')).toEqual({});
		expect(
			parseMapView(
				'{"targetIds":["theater"],"scope":{"rule":{"type":"region"},"title":"Tainan","url":"/regions/tainan/"}}',
			),
		).toEqual({});
	});
});
