import { describe, expect, test } from 'vitest';

import type { ImagorOperations } from '../src/index.ts';

import { extract, generate, transform } from '../src/index.ts';

describe('extract: geometry', () => {
	test('dimensions only', () => {
		expect(extract('800x600/photo.jpg')).toEqual({
			src: 'photo.jpg',
			operations: { width: 800, height: 600 },
			options: {},
		});
	});

	test('width-only drops the zero height', () => {
		expect(extract('800x0/photo.jpg')?.operations).toEqual({ width: 800 });
	});

	test('fit-in maps to contain', () => {
		expect(extract('fit-in/800x600/photo.jpg')?.operations).toEqual({
			width: 800,
			height: 600,
			fit: 'contain',
		});
	});

	test('fit-in plus no_upscale maps to inside and drops the filter', () => {
		expect(extract('fit-in/800x600/filters:no_upscale()/photo.jpg')?.operations).toEqual({
			width: 800,
			height: 600,
			fit: 'inside',
		});
	});

	test('standalone no_upscale stays in the filters record', () => {
		expect(extract('800x0/filters:no_upscale()/photo.jpg')?.operations).toEqual({
			width: 800,
			filters: { no_upscale: '' },
		});
	});

	test('negative dimensions become flip/flop', () => {
		expect(extract('-800x-600/photo.jpg')?.operations).toEqual({
			width: 800,
			height: 600,
			flip: true,
			flop: true,
		});
	});

	test('trim with bottom-right and tolerance', () => {
		expect(extract('trim:bottom-right:30/800x0/photo.jpg')?.operations.trim).toEqual({
			corner: 'bottom-right',
			tolerance: 30,
		});
	});

	test('bare trim is a boolean', () => {
		expect(extract('trim/800x0/photo.jpg')?.operations.trim).toBe(true);
	});

	test('crop ratios', () => {
		expect(extract('0.1x0.2:0.9x0.8/photo.jpg')?.operations.crop).toEqual({
			left: 0.1,
			top: 0.2,
			right: 0.9,
			bottom: 0.8,
		});
	});

	test('uniform padding becomes a number', () => {
		expect(extract('800x600/10x10/photo.jpg')?.operations.padding).toBe(10);
	});

	test('asymmetric padding becomes an object', () => {
		expect(extract('800x0/10x20:30x40/photo.jpg')?.operations.padding).toEqual({
			left: 10,
			top: 20,
			right: 30,
			bottom: 40,
		});
	});

	test('alignment segments', () => {
		expect(extract('800x600/left/top/smart/photo.jpg')?.operations).toEqual({
			width: 800,
			height: 600,
			hAlign: 'left',
			vAlign: 'top',
			smart: true,
		});
	});
});

describe('extract: filters', () => {
	test('quality and format are lifted into typed fields', () => {
		expect(extract('800x0/filters:quality(80):format(webp)/photo.jpg')?.operations).toEqual({
			width: 800,
			quality: 80,
			format: 'webp',
		});
	});

	test('other filters land in the record alongside lifted quality', () => {
		expect(extract('800x0/filters:quality(80):blur(5):grayscale()/photo.jpg')?.operations).toEqual({
			width: 800,
			quality: 80,
			filters: { blur: '5', grayscale: '' },
		});
	});

	test('compound filter args with internal separators are kept intact', () => {
		expect(extract('800x0/filters:focal(150x150:250x250)/photo.jpg')?.operations.filters).toEqual({
			focal: '150x150:250x250',
		});
	});
});

describe('extract: source and edge cases', () => {
	test('bare source with no operations', () => {
		expect(extract('photo.jpg')).toEqual({ src: 'photo.jpg', operations: {}, options: {} });
	});

	test('nested source path is rejoined', () => {
		expect(extract('800x0/folder/sub/photo.jpg')?.src).toBe('folder/sub/photo.jpg');
	});

	test('http source is preserved', () => {
		expect(extract('800x0/https://example.com/photo.jpg')?.src).toBe(
			'https://example.com/photo.jpg',
		);
	});

	test('empty input returns null', () => {
		expect(extract('')).toBeNull();
	});

	test('leading slash is stripped', () => {
		expect(extract('/800x0/photo.jpg')?.src).toBe('photo.jpg');
	});

	test('baseURL prefix is stripped and echoed back', () => {
		const result = extract('/_imagor/800x0/photo.jpg', { baseURL: '/_imagor' });
		expect(result?.src).toBe('photo.jpg');
		expect(result?.options).toEqual({ baseURL: '/_imagor' });
	});

	test('a path-escaped source is decoded back to its original form', () => {
		expect(extract('800x0/top%2Fsecret.jpg')?.src).toBe('top/secret.jpg');
		expect(extract('800x0/https:%2F%2Fcdn.example.com%2Fimg.jpg%3Fv=2')?.src).toBe(
			'https://cdn.example.com/img.jpg?v=2',
		);
	});
});

describe('extract: round-trips generate output', () => {
	const cases: ReadonlyArray<{ name: string; operations: ImagorOperations }> = [
		{ name: 'width only', operations: { width: 800 } },
		{ name: 'width + height', operations: { width: 800, height: 600 } },
		{ name: 'contain', operations: { width: 800, height: 600, fit: 'contain' } },
		{ name: 'inside', operations: { width: 800, height: 600, fit: 'inside' } },
		{ name: 'outside', operations: { width: 800, height: 600, fit: 'outside' } },
		{ name: 'fill', operations: { width: 800, height: 600, fit: 'fill' } },
		{ name: 'flip + flop', operations: { width: 800, height: 600, flip: true, flop: true } },
		{
			name: 'smart + align',
			operations: { width: 800, height: 600, hAlign: 'left', vAlign: 'top', smart: true },
		},
		{
			name: 'trim object',
			operations: { width: 800, trim: { corner: 'bottom-right', tolerance: 30 } },
		},
		{ name: 'crop', operations: { crop: { left: 10, top: 20, right: 300, bottom: 400 } } },
		{ name: 'uniform padding', operations: { width: 800, height: 600, padding: 10 } },
		{
			name: 'asymmetric padding',
			operations: { width: 800, padding: { left: 10, top: 20, right: 30, bottom: 40 } },
		},
		{ name: 'quality + format', operations: { width: 800, quality: 80, format: 'webp' } },
		{
			name: 'record filters',
			operations: { width: 800, filters: { blur: '5', grayscale: '', rgb: '10,20,30' } },
		},
		{ name: 'inside + filters', operations: { width: 800, fit: 'inside', filters: { blur: '5' } } },
		{ name: 'focal with colon', operations: { width: 800, filters: { focal: '150x150:250x250' } } },
	];

	for (const { name, operations } of cases) {
		test(name, () => {
			const generated = generate('photo.jpg', operations);
			const extracted = extract(generated);
			expect(extracted).not.toBeNull();
			if (extracted === null) return;
			expect(generate(extracted.src, extracted.operations)).toBe(generated);
		});
	}
});

describe('transform', () => {
	test('regenerates fresh when the src does not match baseURL', () => {
		expect(transform('photo.jpg', { width: 800 })).toBe('800x0/photo.jpg');
	});

	test('merges operations onto an existing baseURL-prefixed path', () => {
		const existing = `/_imagor/${generate('photo.jpg', { width: 800, quality: 80 })}`;
		expect(transform(existing, { quality: 50 }, { baseURL: '/_imagor' })).toBe(
			'800x0/filters:quality(50)/photo.jpg',
		);
	});

	test('new operations override extracted ones', () => {
		const existing = `/_imagor/${generate('photo.jpg', { width: 800, height: 600 })}`;
		expect(transform(existing, { width: 400 }, { baseURL: '/_imagor' })).toBe('400x600/photo.jpg');
	});
});
