import { getRenditionName } from '@xsynaptic/astro-image-pipeline/names';
import { describe, expect, test } from 'vitest';

import { getImageName, getImagePresetSize, getImagePresetWidths } from '#images.ts';

function makeSource(width: number, height: number, id = 'taiwan/taipei/some-image-1.jpg') {
	return { height, id, width };
}

describe('getImagePresetWidths', () => {
	test('drops a crop whose height the source cannot fill, even when the width fits', () => {
		expect(getImagePresetWidths('card-hq', makeSource(960, 514))).toStrictEqual([450, 600]);
	});

	test('a width-only preset keeps every width up to and including the source width', () => {
		expect(getImagePresetWidths('content', makeSource(1200, 2000))).toStrictEqual([
			450, 600, 900, 1200,
		]);
	});
});

describe('getImagePresetSize', () => {
	test('a crop larger than the source shrinks to the largest of its shape that fits', () => {
		expect(getImagePresetSize('hero', 2400, makeSource(1800, 1200))).toStrictEqual({
			height: 1200,
			width: 1800,
		});
		expect(getImagePresetSize('card-hq', 1200, makeSource(960, 514))).toStrictEqual({
			height: 514,
			width: 771,
		});
	});

	test('the feed keeps the source ratio, so a 4:3 image is not cropped to 3:2', () => {
		expect(getImagePresetSize('feed', 1200, makeSource(4000, 3000))).toStrictEqual({
			height: 900,
			width: 1200,
		});
	});
});

describe('getImageName', () => {
	test('width-only and cropped names sit beside the source', () => {
		const source = makeSource(3600, 2400);

		expect(getImageName(source, 'content', 1200)).toBe('taiwan/taipei/some-image-1-1200.jpg');
		expect(getImageName(source, 'hero', 1200)).toBe('taiwan/taipei/some-image-1-1200x800.webp');
		expect(getImageName(source, 'popup', 350)).toBe('taiwan/taipei/some-image-1-350x233.webp');
		expect(getImageName(source, 'popup', 700)).toBe('taiwan/taipei/some-image-1-700x467.webp');
	});

	test('a preset width the source cannot fill throws rather than upscaling', () => {
		expect(() => getImageName(makeSource(960, 514), 'card-hq', 900)).toThrow(
			'no "card-hq" rendition 900 wide',
		);
	});

	test('a capped width is accepted only when it is the cap of a preset width', () => {
		const source = makeSource(960, 514);

		expect(getImageName(source, 'card-hq', 771)).toBe('taiwan/taipei/some-image-1-771x514.jpg');
		expect(() => getImageName(source, 'card-hq', 700)).toThrow('no "card-hq" rendition 700 wide');
	});

	test.each(['trip/IMG 0001.jpg', 'trip/day, 2.jpg', "trip/it's.png", 'trip/../b.jpg'])(
		'a source path the name grammar would reject throws at build time: %s',
		(id) => {
			expect(() => getImageName(makeSource(3600, 2400, id), 'content', 1200)).toThrow(
				'rename the file',
			);
		},
	);

	test('a preset and a sized call for the same size and format share one name', () => {
		const source = makeSource(3600, 2400);

		expect(getRenditionName(source, { format: 'webp', height: 800, width: 1200 })).toBe(
			getImageName(source, 'hero', 1200),
		);
		expect(getImageName(source, 'feed', 900)).toBe(getImageName(source, 'card-hq', 900));
	});
});
