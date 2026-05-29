import { describe, expect, test } from 'vitest';

import { generate } from '../src/index.ts';

describe('generate', () => {
	test('width-only emits Wx0 with no fit-in', () => {
		expect(generate('photo.jpg', { width: 800 })).toBe('800x0/photo.jpg');
	});

	test('width + height emits WxH (default crop-to-fill)', () => {
		expect(generate('photo.jpg', { width: 800, height: 600 })).toBe('800x600/photo.jpg');
	});

	test('fit: contain emits fit-in segment', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, fit: 'contain' })).toBe(
			'fit-in/800x600/photo.jpg',
		);
	});

	test('fit: inside is treated the same as contain', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, fit: 'inside' })).toBe(
			'fit-in/800x600/photo.jpg',
		);
	});

	test('fit: cover stays as default WxH', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, fit: 'cover' })).toBe(
			'800x600/photo.jpg',
		);
	});

	test('smart: true emits smart segment after dimensions', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, smart: true })).toBe(
			'800x600/smart/photo.jpg',
		);
	});

	test('quality and format become filters', () => {
		expect(generate('photo.jpg', { width: 800, quality: 80, format: 'webp' })).toBe(
			'800x0/filters:quality(80):format(webp)/photo.jpg',
		);
	});

	test('passthrough filters are appended in order', () => {
		expect(
			generate('photo.jpg', {
				width: 800,
				quality: 80,
				filters: ['strip_metadata()', 'sharpen(0.5)'],
			}),
		).toBe('800x0/filters:quality(80):strip_metadata():sharpen(0.5)/photo.jpg');
	});

	test('leading slash on src is stripped', () => {
		expect(generate('/path/photo.jpg', { width: 800 })).toBe('800x0/path/photo.jpg');
	});

	test('URL src is stringified', () => {
		const url = new URL('https://example.com/path/photo.jpg');
		expect(generate(url, { width: 800 })).toBe('800x0/https://example.com/path/photo.jpg');
	});

	test('baseURL prefix is stripped from src when present', () => {
		expect(generate('/_imagor/path/photo.jpg', { width: 800 }, { baseURL: '/_imagor' })).toBe(
			'800x0/path/photo.jpg',
		);
	});
});
