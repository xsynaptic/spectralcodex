import { MapPopupOwnField } from '@spectralcodex/map-codec';
import { describe, expect, test } from 'vitest';

import { getPopupImageSrc, getPopupImageSrcSet, getTargetPopupItem } from '#popup/popup-factory.ts';

describe('getTargetPopupItem', () => {
	const item = {
		description: 'desc',
		googleMapsUrl: 'abc',
		id: 'a',
		popupImageSources: [{ path: 'a-350x233.webp', width: 350 }],
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
			popupImageSources: undefined,
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

	test('a titled Point shows its own titles in place of the Location: Point pair', () => {
		expect(
			getTargetPopupItem({
				...item,
				ownTitle: 'Point',
				ownTitleMultilingualLang: 'zh',
				ownTitleMultilingualValue: '殿',
			}),
		).toMatchObject({ title: 'Point', titleMultilingualLang: 'zh', titleMultilingualValue: '殿' });
		expect(getTargetPopupItem({ ...item, ownTitle: 'Point' })).toMatchObject({
			title: 'Point',
			titleMultilingualLang: undefined,
			titleMultilingualValue: undefined,
		});
	});

	test('a Point titled only in another script leads with that title and repeats nothing above it', () => {
		expect(
			getTargetPopupItem({
				...item,
				ownTitleMultilingualLang: 'zh',
				ownTitleMultilingualValue: '殿',
			}),
		).toMatchObject({
			title: '殿',
			titleMultilingualLang: undefined,
			titleMultilingualValue: undefined,
		});
	});
});

describe('popup image', () => {
	const popupImageSources = [
		{ path: 'a/b-700x467.webp', width: 700 },
		{ path: 'a/b-350x233.webp', width: 350 },
	];

	test('the fallback src is the narrowest source under the image base', () => {
		expect(getPopupImageSrc(popupImageSources, 'https://img.example.com')).toBe(
			'https://img.example.com/a/b-350x233.webp',
		);
	});

	test('every source rides in the srcset with its width descriptor', () => {
		expect(getPopupImageSrcSet(popupImageSources, '/_img')).toBe(
			'/_img/a/b-700x467.webp 700w, /_img/a/b-350x233.webp 350w',
		);
	});
});
