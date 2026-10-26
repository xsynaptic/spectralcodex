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
