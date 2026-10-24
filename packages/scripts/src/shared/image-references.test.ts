import { describe, expect, test } from 'vitest';

import { getEntryImageIds } from '#shared/image-references.ts';

function getBodyIds(body: string) {
	return getEntryImageIds({ body, data: {} }).body;
}

describe('getEntryImageIds', () => {
	test('reads the src of every Img in document order', () => {
		const body = [
			'<Img src="temples/facade.jpg" />',
			'<Img src="streets/alley.jpg">A caption</Img>',
		];

		expect(getBodyIds(body.join('\n'))).toEqual(['temples/facade.jpg', 'streets/alley.jpg']);
	});

	test('does not read `data-src` as the `src` prop', () => {
		expect(getBodyIds('<Img data-src="temples/facade.jpg" />')).toEqual([]);
	});

	test('skips ImgGroup, which is a different component', () => {
		expect(getBodyIds('<ImgGroup src="temples/facade.jpg" />')).toEqual([]);
	});

	test('reads a single-quoted value', () => {
		expect(getBodyIds("<Img src='temples/facade.jpg' />")).toEqual(['temples/facade.jpg']);
	});

	test('reads imageFeatured as a single id or a list of ids and objects', () => {
		expect(getEntryImageIds({ data: { imageFeatured: 'temples/facade.jpg' } }).featured).toEqual([
			'temples/facade.jpg',
		]);
		expect(
			getEntryImageIds({
				data: {
					imageFeatured: [
						'temples/facade.jpg',
						{ hero: true, id: 'streets/alley.jpg', link: 'locations/alley' },
					],
				},
			}).featured,
		).toEqual(['temples/facade.jpg', 'streets/alley.jpg']);
	});

	test('an entry without a body or a valid imageFeatured references nothing', () => {
		expect(getEntryImageIds({ data: { imageFeatured: { id: 'not-a-list.jpg' } } })).toEqual({
			body: [],
			featured: [],
		});
	});
});
