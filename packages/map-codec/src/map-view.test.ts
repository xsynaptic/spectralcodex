import { describe, expect, test } from 'vitest';

import { isMapView } from '#map-view.ts';

const scope = { rule: { ids: ['theater'], type: 'ids' }, title: 'Tainan', url: '/regions/tainan/' };

describe('isMapView', () => {
	test.each([
		{ name: 'an empty view', view: {} },
		{ name: 'Targets alone', view: { targetIds: ['theater', 'theater-1'] } },
		{ name: 'an ids Scope', view: { scope } },
		{ name: 'a theme Scope', view: { scope: { ...scope, rule: { index: 3, type: 'theme' } } } },
		{
			name: 'a region Scope with a Division and flat bounds',
			view: {
				scope: {
					...scope,
					apiDivisionUrl: '/api/map/divisions/tainan.json',
					bounds: [120, 22.8, 120.7, 23.5],
					rule: { interval: [12, 48], type: 'region' },
				},
			},
		},
		{
			name: 'corner-pair bounds',
			view: {
				scope: {
					...scope,
					bounds: [
						[120, 22.8],
						[120.7, 23.5],
					],
				},
			},
		},
	])('accepts $name', ({ view }) => {
		expect(isMapView(view)).toBe(true);
	});

	test.each([
		{ name: 'a value that is not an object', view: ['theater'] },
		{ name: 'null', view: JSON.parse('null') as unknown },
		{ name: 'an unknown rule type', view: { scope: { ...scope, rule: { type: 'series' } } } },
		{
			name: 'a region rule without its interval',
			view: { scope: { ...scope, rule: { type: 'region' } } },
		},
		{ name: 'three flat bounds', view: { scope: { ...scope, bounds: [120, 22.8, 120.7] } } },
		{ name: 'one corner pair', view: { scope: { ...scope, bounds: [[120, 22.8]] } } },
		{ name: 'a string for targetIds', view: { targetIds: 'theater' } },
		{ name: 'a number among targetIds', view: { targetIds: ['theater', 1] } },
		{ name: 'a Scope without a url', view: { scope: { rule: scope.rule, title: 'Tainan' } } },
	])('rejects $name', ({ view }) => {
		expect(isMapView(view)).toBe(false);
	});
});
