import { describe, expect, test } from 'vitest';

import { extractMdxImageIds } from './images';

describe('extractMdxImageIds', () => {
	test('reads the src of every Img in document order', () => {
		const body = [
			'<Img src="temples/facade.jpg" />',
			'<Img src="streets/alley.jpg">A caption</Img>',
		];

		expect(extractMdxImageIds(body.join('\n'))).toEqual([
			'temples/facade.jpg',
			'streets/alley.jpg',
		]);
	});

	test('does not read `data-src` as the `src` prop', () => {
		expect(extractMdxImageIds('<Img data-src="temples/facade.jpg" />')).toEqual([]);
	});

	test('skips ImgGroup, which is a different component', () => {
		expect(extractMdxImageIds('<ImgGroup src="temples/facade.jpg" />')).toEqual([]);
	});

	test('reads a single-quoted value', () => {
		expect(extractMdxImageIds("<Img src='temples/facade.jpg' />")).toEqual(['temples/facade.jpg']);
	});
});
