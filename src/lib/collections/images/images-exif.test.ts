import type { Tags } from 'exiftool-vendored';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import { extractExifData, getImageExposureValue } from '#lib/collections/images/images-exif.ts';

function makeExiftool(tags: Tags) {
	return { read: () => Promise.resolve(tags) };
}

describe('getImageExposureValue', () => {
	test('reads a fractional shutter speed as a fraction of a second', () => {
		const exposureValue = getImageExposureValue({ aperture: '2.8', shutterSpeed: '1/250' });

		expect(Number(exposureValue)).toBeCloseTo(10.94, 2);
	});

	test('reads a bare shutter speed as whole seconds', () => {
		expect(getImageExposureValue({ aperture: '8', shutterSpeed: '2' })).toBe('5');
	});

	test('returns undefined for a missing input or an unusable fraction', () => {
		expect(getImageExposureValue({ aperture: undefined, shutterSpeed: '1/250' })).toBeUndefined();
		expect(getImageExposureValue({ aperture: '2.8', shutterSpeed: '0/250' })).toBeUndefined();
		expect(getImageExposureValue({ aperture: '2.8', shutterSpeed: '1/x' })).toBeUndefined();
	});

	test('returns undefined when the result is not a finite number', () => {
		expect(getImageExposureValue({ aperture: 'wide', shutterSpeed: '1/250' })).toBeUndefined();
		expect(getImageExposureValue({ aperture: '2.8', shutterSpeed: 'bulb' })).toBeUndefined();
		expect(getImageExposureValue({ aperture: '2.8', shutterSpeed: '0' })).toBeUndefined();
		expect(getImageExposureValue({ aperture: '0', shutterSpeed: '1/250' })).toBeUndefined();
	});
});

describe('extractExifData', () => {
	test('stringifies numeric tags, falls back to the lens model, and places GPS as lon/lat', async () => {
		const exif = await extractExifData(
			'image.jpg',
			makeExiftool({
				FNumber: 8,
				GPSLatitude: 25.03,
				GPSLongitude: 121.56,
				ISO: 100,
				LensModel: 'XF23mmF2',
				ShutterSpeed: '2',
				Title: 'Temple gate',
			}),
		);

		expect(exif).toMatchObject({
			aperture: '8',
			description: '',
			exposureValue: '5',
			geometry: { coordinates: [121.56, 25.03], type: GeometryTypeEnum.Point },
			iso: '100',
			lens: 'XF23mmF2',
			title: 'Temple gate',
		});
	});

	test('leaves out geometry when either GPS coordinate is missing', async () => {
		const exif = await extractExifData('image.jpg', makeExiftool({ GPSLatitude: 25.03 }));

		expect(exif).not.toHaveProperty('geometry');
	});
});
