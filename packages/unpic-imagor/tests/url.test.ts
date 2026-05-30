import { describe, expect, test } from 'vitest';

import { generate } from '../src/index.ts';

describe('generate: dimensions', () => {
	test('width-only emits Wx0 with no fit-in', () => {
		expect(generate('photo.jpg', { width: 800 })).toBe('800x0/photo.jpg');
	});

	test('width + height emits WxH (default crop-to-fill)', () => {
		expect(generate('photo.jpg', { width: 800, height: 600 })).toBe('800x600/photo.jpg');
	});

	test('string dimensions are coerced', () => {
		expect(generate('photo.jpg', { width: '800', height: '600' })).toBe('800x600/photo.jpg');
	});

	test('no dimensions and no geometry emits just the source', () => {
		expect(generate('photo.jpg', {})).toBe('photo.jpg');
	});
});

describe('generate: fit mapping', () => {
	test('contain emits fit-in', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, fit: 'contain' })).toBe(
			'fit-in/800x600/photo.jpg',
		);
	});

	test('inside emits fit-in plus no_upscale()', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, fit: 'inside' })).toBe(
			'fit-in/800x600/filters:no_upscale()/photo.jpg',
		);
	});

	test('outside emits full-fit-in', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, fit: 'outside' })).toBe(
			'full-fit-in/800x600/photo.jpg',
		);
	});

	test('fill emits stretch', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, fit: 'fill' })).toBe(
			'stretch/800x600/photo.jpg',
		);
	});

	test('cover stays as default WxH', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, fit: 'cover' })).toBe(
			'800x600/photo.jpg',
		);
	});
});

describe('generate: flip and flop', () => {
	test('flop emits a negative width', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, flop: true })).toBe(
			'-800x600/photo.jpg',
		);
	});

	test('flip emits a negative height', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, flip: true })).toBe(
			'800x-600/photo.jpg',
		);
	});
});

describe('generate: alignment and smart', () => {
	test('smart emits the smart segment after dimensions', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, smart: true })).toBe(
			'800x600/smart/photo.jpg',
		);
	});

	test('left and top alignment are emitted; center and middle are not', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, hAlign: 'left', vAlign: 'top' })).toBe(
			'800x600/left/top/photo.jpg',
		);
		expect(
			generate('photo.jpg', { width: 800, height: 600, hAlign: 'center', vAlign: 'middle' }),
		).toBe('800x600/photo.jpg');
	});
});

describe('generate: trim', () => {
	test('true emits a bare trim segment', () => {
		expect(generate('photo.jpg', { width: 800, trim: true })).toBe('trim/800x0/photo.jpg');
	});

	test('tolerance is appended', () => {
		expect(generate('photo.jpg', { width: 800, trim: { tolerance: 30 } })).toBe(
			'trim:30/800x0/photo.jpg',
		);
	});

	test('bottom-right corner with tolerance', () => {
		expect(
			generate('photo.jpg', { width: 800, trim: { corner: 'bottom-right', tolerance: 30 } }),
		).toBe('trim:bottom-right:30/800x0/photo.jpg');
	});

	test('top-left corner is the default and adds no orientation', () => {
		expect(generate('photo.jpg', { width: 800, trim: { corner: 'top-left' } })).toBe(
			'trim/800x0/photo.jpg',
		);
	});
});

describe('generate: crop and padding', () => {
	test('crop with ratio values', () => {
		expect(generate('photo.jpg', { crop: { left: 0.1, top: 0.2, right: 0.9, bottom: 0.8 } })).toBe(
			'0.1x0.2:0.9x0.8/photo.jpg',
		);
	});

	test('uniform numeric padding emits a single dimensions slot', () => {
		expect(generate('photo.jpg', { width: 800, height: 600, padding: 10 })).toBe(
			'800x600/10x10/photo.jpg',
		);
	});

	test('symmetric padding object collapses to LxT', () => {
		expect(
			generate('photo.jpg', { width: 800, padding: { left: 10, top: 20, right: 10, bottom: 20 } }),
		).toBe('800x0/10x20/photo.jpg');
	});

	test('asymmetric padding object emits LxT:RxB', () => {
		expect(
			generate('photo.jpg', { width: 800, padding: { left: 10, top: 20, right: 30, bottom: 40 } }),
		).toBe('800x0/10x20:30x40/photo.jpg');
	});

	test('padding without dimensions still emits a 0x0 dimensions slot', () => {
		expect(generate('photo.jpg', { padding: 10 })).toBe('0x0/10x10/photo.jpg');
	});
});

describe('generate: filters', () => {
	test('quality and format become filters', () => {
		expect(generate('photo.jpg', { width: 800, quality: 80, format: 'webp' })).toBe(
			'800x0/filters:quality(80):format(webp)/photo.jpg',
		);
	});

	test('record filters serialise as name(args), empty value as a bare filter', () => {
		expect(generate('photo.jpg', { width: 800, filters: { blur: '5', grayscale: '' } })).toBe(
			'800x0/filters:blur(5):grayscale()/photo.jpg',
		);
	});

	test('quality precedes record filters', () => {
		expect(generate('photo.jpg', { width: 800, quality: 80, filters: { blur: '5' } })).toBe(
			'800x0/filters:quality(80):blur(5)/photo.jpg',
		);
	});

	test('compound filter args with internal separators pass through verbatim', () => {
		expect(generate('photo.jpg', { width: 800, filters: { focal: '150x150:250x250' } })).toBe(
			'800x0/filters:focal(150x150:250x250)/photo.jpg',
		);
	});

	test('fit: inside emits no_upscale() before record filters', () => {
		expect(generate('photo.jpg', { width: 800, fit: 'inside', filters: { blur: '5' } })).toBe(
			'fit-in/800x0/filters:no_upscale():blur(5)/photo.jpg',
		);
	});
});

describe('generate: source handling', () => {
	test('leading slash on src is stripped', () => {
		expect(generate('/path/photo.jpg', { width: 800 })).toBe('800x0/path/photo.jpg');
	});

	test('clean URL src is left unescaped', () => {
		const url = new URL('https://example.com/path/photo.jpg');
		expect(generate(url, { width: 800 })).toBe('800x0/https://example.com/path/photo.jpg');
	});

	test('baseURL prefix is stripped from src when present', () => {
		expect(generate('/_imagor/path/photo.jpg', { width: 800 }, { baseURL: '/_imagor' })).toBe(
			'800x0/path/photo.jpg',
		);
	});

	test('http source with a query string is path-escaped, keeping = and &', () => {
		expect(generate('https://cdn.example.com/img.jpg?v=2&w=1', { width: 800 })).toBe(
			'800x0/https:%2F%2Fcdn.example.com%2Fimg.jpg%3Fv=2&w=1',
		);
	});

	test('source starting with a reserved segment word is path-escaped', () => {
		expect(generate('top/secret.jpg', { width: 800 })).toBe('800x0/top%2Fsecret.jpg');
	});

	test('b64 source passes through untouched', () => {
		expect(generate('b64:SGVsbG8', { width: 800 })).toBe('800x0/b64:SGVsbG8');
	});
});
