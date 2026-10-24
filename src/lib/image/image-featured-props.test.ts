import { describe, expect, test, vi } from 'vitest';

const { getImageByIdMock } = vi.hoisted(() => ({ getImageByIdMock: vi.fn() }));

vi.mock('#lib/collections/images/images-data.ts', () => ({
	getImageByIdFunction: () => Promise.resolve(getImageByIdMock),
	getImageSource: ({ data, id }: { data: { height: number; width: number }; id: string }) => ({
		height: data.height,
		id,
		width: data.width,
	}),
}));

const { getImageFeaturedProps } = await import('#lib/image/image-featured-props.ts');

const baseOptions = {
	preset: 'card',
	sizes: '100vw',
	width: 900,
} as const;

function mockImage(data: { height: number; title: string; width: number }) {
	getImageByIdMock.mockReturnValue({ data, id: 'some-image.jpg' });
}

describe('getImageFeaturedProps', () => {
	test('a missing or unknown image yields nothing to render', async () => {
		getImageByIdMock.mockReturnValue(undefined);

		expect(await getImageFeaturedProps({ ...baseOptions, imageId: undefined })).toStrictEqual({
			imageProps: undefined,
			placeholderProps: undefined,
		});
		expect(await getImageFeaturedProps({ ...baseOptions, imageId: 'gone' })).toStrictEqual({
			imageProps: undefined,
			placeholderProps: undefined,
		});
	});

	test('the placeholder reserves the crop of the requested preset', async () => {
		mockImage({ height: 2667, title: 'Some image', width: 4000 });

		const { placeholderProps } = await getImageFeaturedProps({
			...baseOptions,
			imageId: 'some-image.jpg',
			preset: 'search',
		});

		expect(placeholderProps?.aspectRatio).toBe(4 / 3);
	});

	test('alt text falls back to the image title, stripped of markup', async () => {
		mockImage({ height: 2667, title: 'A <em>marked up</em>  title', width: 4000 });

		const { imageProps } = await getImageFeaturedProps({
			...baseOptions,
			imageId: 'some-image.jpg',
		});

		expect(imageProps?.alt).toBe('A marked up title');
	});

	test('a supplied alt wins over the image title', async () => {
		mockImage({ height: 2667, title: 'Image title', width: 4000 });

		const { imageProps } = await getImageFeaturedProps({
			...baseOptions,
			alt: 'Caller alt',
			imageId: 'some-image.jpg',
		});

		expect(imageProps?.alt).toBe('Caller alt');
	});

	test('priority reaches both the image and its placeholder, and is off by default', async () => {
		mockImage({ height: 2667, title: 'Some image', width: 4000 });

		const eager = await getImageFeaturedProps({
			...baseOptions,
			imageId: 'some-image.jpg',
			priority: true,
		});

		expect(eager.imageProps?.priority).toBe(true);
		expect(eager.placeholderProps?.highQuality).toBe(true);

		const lazy = await getImageFeaturedProps({ ...baseOptions, imageId: 'some-image.jpg' });

		expect(lazy.imageProps?.priority).toBe(false);
		expect(lazy.placeholderProps?.highQuality).toBe(false);
	});
});
