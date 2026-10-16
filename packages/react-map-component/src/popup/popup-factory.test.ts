import { MapPopupOwnField } from '@spectralcodex/map-codec';
import { describe, expect, test } from 'vitest';

import { getTargetPopupItem } from '#popup/popup-factory.ts';

describe('getTargetPopupItem', () => {
	const item = {
		description: 'desc',
		googleMapsUrl: 'abc',
		id: 'a',
		image: { srcSet: '/a.jpg 1x' },
		precision: 2,
		title: 'Location: Point',
		titleMultilingualLang: 'zh',
		titleMultilingualValue: '寺',
		url: '/location/',
		wikipediaUrl: 'en.wikipedia.org/wiki/A',
	};

	test('a Point that sets nothing itself keeps its titles and its Google Maps link only', () => {
		expect(getTargetPopupItem(item)).toEqual({
			description: undefined,
			googleMapsUrl: 'abc',
			id: 'a',
			image: undefined,
			precision: undefined,
			title: 'Location: Point',
			titleMultilingualLang: 'zh',
			titleMultilingualValue: '寺',
			url: undefined,
			wikipediaUrl: undefined,
		});
	});

	test('each field comes back with its own bit, and the page link never does', () => {
		const own =
			MapPopupOwnField.Description |
			MapPopupOwnField.Image |
			MapPopupOwnField.Precision |
			MapPopupOwnField.Wikipedia;

		expect(getTargetPopupItem({ ...item, own })).toEqual({ ...item, own, url: undefined });
		expect(getTargetPopupItem({ ...item, own: MapPopupOwnField.Precision })).toMatchObject({
			description: undefined,
			precision: 2,
			wikipediaUrl: undefined,
		});
	});
});
