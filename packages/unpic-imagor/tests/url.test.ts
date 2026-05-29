import { describe, expect, test } from 'vitest';

import { generate, sign } from '../src/index.ts';

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

describe('sign', () => {
	// Canonical test vector from docs.imagor.net/security
	test('matches docs.imagor.net canonical example byte-for-byte', () => {
		const path = '500x500/top/raw.githubusercontent.com/cshum/imagor/master/testdata/gopher.png';
		expect(sign(path, 'mysecret')).toBe('IGEn3TxngivD0jy4uuiZim2bdUCvhcnVi1Nm0xGy');
	});

	test('different secret produces different signature', () => {
		const path = '800x0/photo.jpg';
		expect(sign(path, 'a')).not.toBe(sign(path, 'b'));
	});

	test('signatureLength of 20 returns 20-char signature', () => {
		expect(sign('800x0/photo.jpg', 'secret', 20)).toHaveLength(20);
	});

	test('signature is url-safe base64 (no + / =)', () => {
		const sig = sign('800x0/photo.jpg', 'secret');
		expect(sig).not.toMatch(/[+/=]/);
	});
});
