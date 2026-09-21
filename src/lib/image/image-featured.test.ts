import { describe, expect, test } from 'vitest';

import type { CatalogCaption } from '#lib/catalog/catalog-types.ts';

import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';
import {
	getImageFeaturedGroup,
	getImageFeaturedGroupByCatalog,
} from '#lib/image/image-featured.ts';

const captions: Record<string, CatalogCaption> = {
	'xiluo-theater': {
		id: 'xiluo-theater',
		title: 'Xiluo Theater',
		titleMultilingual: undefined,
		url: '/locations/xiluo-theater/',
	},
};

const getCaption = (id: string) => captions[id];

describe('getImageFeaturedGroup', () => {
	test('no featured image yields no group', () => {
		expect(getImageFeaturedGroup({ getCaption, imageFeatured: undefined })).toBeUndefined();
	});

	test('a bare string and an object normalize to the same shape, in order', () => {
		const group = getImageFeaturedGroup({
			getCaption,
			imageFeatured: ['first.jpg', { hero: true, id: 'second.jpg' }],
		});

		expect(group).toStrictEqual([{ id: 'first.jpg' }, { hero: true, id: 'second.jpg' }]);
	});

	test('a linked image takes the entry id and url alongside the caption', () => {
		const group = getImageFeaturedGroup({
			getCaption,
			imageFeatured: [{ id: 'a.jpg', link: 'xiluo-theater' }],
		});

		expect(group).toStrictEqual([
			{
				caption: {
					id: 'xiluo-theater',
					title: 'Xiluo Theater',
					titleMultilingual: undefined,
					url: '/locations/xiluo-theater/',
				},
				id: 'a.jpg',
				link: 'xiluo-theater',
			},
		]);
	});

	test('an own title with no link captions the image on its own', () => {
		const group = getImageFeaturedGroup({
			getCaption,
			imageFeatured: [{ id: 'a.jpg', title: 'A caption' }],
		});

		expect(group).toStrictEqual([
			{
				caption: { title: 'A caption', titleMultilingual: undefined },
				id: 'a.jpg',
				title: 'A caption',
			},
		]);
	});
});

describe('getImageFeaturedGroupByCatalog', () => {
	const items = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'].map((id) =>
		makeCatalogItem({ collection: 'locations', id, imageId: `${id}.jpg` }),
	);

	test('keeps catalog order unless shuffling is asked for', () => {
		const group = getImageFeaturedGroupByCatalog({ items });

		expect(group?.map((image) => image.id)).toStrictEqual(items.map((item) => item.imageId));
	});

	test('an item with no image contributes nothing', () => {
		const group = getImageFeaturedGroupByCatalog({
			items: [makeCatalogItem({ collection: 'locations', id: 'no-image' }), items[0]!],
		});

		expect(group?.map((image) => image.id)).toStrictEqual(['alpha.jpg']);
	});

	test('an empty or absent catalog yields no group', () => {
		expect(getImageFeaturedGroupByCatalog({ items: [] })).toBeUndefined();
		expect(getImageFeaturedGroupByCatalog({ items: undefined })).toBeUndefined();
	});
});
