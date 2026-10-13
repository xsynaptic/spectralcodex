import { MapPopupOwnField } from '@spectralcodex/map-codec';
import { describe, expect, test } from 'vitest';

import { getPopupLayout, getTargetPopupItem } from '#canvas/canvas-popup-factory.ts';

describe('getPopupLayout', () => {
	test('a wide map gets the full popup beside the Point', () => {
		expect(getPopupLayout(1200)).toEqual({ isNarrow: false, maxWidthPx: 350 });
	});

	test('the popup drops under the Point once the map is 640px or less', () => {
		expect(getPopupLayout(641).isNarrow).toBe(false);
		expect(getPopupLayout(640).isNarrow).toBe(true);
	});

	test('a narrow map caps the popup at 300px', () => {
		expect(getPopupLayout(600)).toEqual({ isNarrow: true, maxWidthPx: 300 });
	});

	test('the popup never takes more than four fifths of the map', () => {
		expect(getPopupLayout(320)).toEqual({ isNarrow: true, maxWidthPx: 256 });
		expect(getPopupLayout(333).maxWidthPx).toBe(266);
	});

	test('a wide popup beside a centred Point stays inside the narrowest wide map', () => {
		const containerWidth = 641;
		const easePaddingRight = 180;
		const popupOffset = 16;
		const pointX = (containerWidth - easePaddingRight) / 2;

		expect(pointX + popupOffset + getPopupLayout(containerWidth).maxWidthPx).toBeLessThanOrEqual(
			containerWidth,
		);
	});
});

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
