import { beforeEach, describe, expect, test } from 'vitest';

import {
	getImageDerivative,
	getImageManifestRecorder,
	getImagePresetSize,
	getImagePresetWidths,
} from '#images.ts';

function makeSource(width: number, height: number, id = 'taiwan/taipei/some-image-1.jpg') {
	return { height, id, width };
}

beforeEach(() => {
	const recorder = getImageManifestRecorder();

	recorder.derivatives.clear();
	recorder.sources.clear();
});

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

describe('getImageDerivative', () => {
	test('width-only and cropped derivatives take distinct names beside the source', () => {
		const source = makeSource(3600, 2400);

		expect(getImageDerivative(source, 'content', 1200).path).toBe(
			'taiwan/taipei/some-image-1-1200.jpg',
		);
		expect(getImageDerivative(source, 'hero', 1200).path).toBe(
			'taiwan/taipei/some-image-1-1200x800.webp',
		);
	});

	test('a preset width the source cannot fill throws rather than upscaling', () => {
		expect(() => getImageDerivative(makeSource(960, 514), 'card-hq', 900)).toThrow('too small');
	});

	test('a capped width is accepted only when it is the cap of a preset width', () => {
		const source = makeSource(960, 514);

		expect(getImageDerivative(source, 'card-hq', 771)).toMatchObject({ height: 514, width: 771 });
		expect(() => getImageDerivative(source, 'card-hq', 700)).toThrow('not in the "card-hq" preset');
	});

	test('the recorder keeps each source with its derivatives', () => {
		const source = makeSource(3600, 2400);

		getImageDerivative(source, 'popup', 350);
		getImageDerivative(source, 'popup', 700);

		const recorder = getImageManifestRecorder();

		expect([...recorder.derivatives.keys()]).toStrictEqual([
			'taiwan/taipei/some-image-1-350x233.webp',
			'taiwan/taipei/some-image-1-700x467.webp',
		]);
		expect(recorder.sources.get(source.id)).toStrictEqual({
			height: 2400,
			width: 3600,
		});
	});

	test('two sources sharing a stem cannot claim the same name', () => {
		getImageDerivative(makeSource(1200, 800, 'errata/demo/a.png'), 'content', 450);

		expect(() =>
			getImageDerivative(makeSource(1200, 800, 'errata/demo/a.jpg'), 'content', 450),
		).toThrow('claimed by both');
	});
});
