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
	test.each([
		[undefined, 'A marked up title'],
		['Caller alt', 'Caller alt'],
	])('alt %s reads as %s, falling back to the image title', async (alt, expected) => {
		mockImage({ height: 2667, title: 'A <em>marked up</em>  title', width: 4000 });

		const { imageProps } = await getImageFeaturedProps({
			...baseOptions,
			...(alt === undefined ? {} : { alt }),
			imageId: 'some-image.jpg',
		});

		expect(imageProps?.alt).toBe(expected);
	});
});
