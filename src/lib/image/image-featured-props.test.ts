import { describe, expect, test, vi } from 'vitest';

const { getImageByIdMock } = vi.hoisted(() => ({ getImageByIdMock: vi.fn() }));

vi.mock('#lib/collections/images/images-utils.ts', () => ({
	getImageByIdFunction: () => Promise.resolve(getImageByIdMock),
}));

const { getImageFeaturedProps } = await import('#lib/image/image-featured-props.ts');

const baseOptions = {
	imageFormat: 'webp',
	imageQuality: 80,
	sizes: '100vw',
	width: 1200,
} as const;

function mockImage(data: { title: string; width: number }) {
	getImageByIdMock.mockReturnValue({ data });
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

	test('height follows the fixed 3:2 ratio the placeholder reserves', async () => {
		mockImage({ title: 'Some image', width: 4000 });

		const { imageProps, placeholderProps } = await getImageFeaturedProps({
			...baseOptions,
			imageId: 'some-image',
			width: 901,
		});

		expect(imageProps?.height).toBe(601);
		expect(imageProps?.height).toBe(Math.round(901 / placeholderProps!.aspectRatio));
	});

	test('the placeholder crops the way the image does, so the swap is seamless', async () => {
		mockImage({ title: 'Some image', width: 4000 });

		const { imageProps, placeholderProps } = await getImageFeaturedProps({
			...baseOptions,
			imageId: 'some-image',
		});

		expect(placeholderProps?.fit).toBe(imageProps?.operations.fit);
	});

	test('breakpoints stop at the original width, and custom widths override the defaults', async () => {
		mockImage({ title: 'Some image', width: 700 });

		const { imageProps } = await getImageFeaturedProps({
			...baseOptions,
			imageId: 'some-image',
		});

		expect(imageProps?.breakpoints.every((width) => width <= 700)).toBe(true);

		const custom = await getImageFeaturedProps({
			...baseOptions,
			imageId: 'some-image',
			widths: [400, 800],
		});

		expect(custom.imageProps?.breakpoints).toStrictEqual([400]);
	});

	test('alt text falls back to the image title, stripped of markup', async () => {
		mockImage({ title: 'A <em>marked up</em>  title', width: 4000 });

		const { imageProps } = await getImageFeaturedProps({ ...baseOptions, imageId: 'some-image' });

		expect(imageProps?.alt).toBe('A marked up title');
	});

	test('a supplied alt wins over the image title', async () => {
		mockImage({ title: 'Image title', width: 4000 });

		const { imageProps } = await getImageFeaturedProps({
			...baseOptions,
			alt: 'Caller alt',
			imageId: 'some-image',
		});

		expect(imageProps?.alt).toBe('Caller alt');
	});

	test('priority reaches both the image and its placeholder, and is off by default', async () => {
		mockImage({ title: 'Some image', width: 4000 });

		const eager = await getImageFeaturedProps({
			...baseOptions,
			imageId: 'some-image',
			priority: true,
		});

		expect(eager.imageProps?.priority).toBe(true);
		expect(eager.placeholderProps?.highQuality).toBe(true);

		const lazy = await getImageFeaturedProps({ ...baseOptions, imageId: 'some-image' });

		expect(lazy.imageProps?.priority).toBe(false);
		expect(lazy.placeholderProps?.highQuality).toBe(false);
	});
});
