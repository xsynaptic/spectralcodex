import { reference, z } from 'astro:content';

import type { ImageFunction } from 'astro:content';

import { CONTENT_IMAGE_FEATURED_MIN_WIDTH } from '@/constants';

interface GetImageTransformBaseParams {
	image: ImageFunction;
}

type GetImageTransformExtendedParams = GetImageTransformBaseParams & {
	defaultPath?: string;
	minWidth?: number;
};

// This function handles image size validation and adds a default path to the image `src` where needed
export const getImageTransformFunction = ({
	image,
	minWidth = CONTENT_IMAGE_FEATURED_MIN_WIDTH,
}: GetImageTransformExtendedParams) =>
	z.string().pipe(
		image().transform((img, ctx) => {
			if (img.width <= minWidth)
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Preview image must be at least ${String(minWidth)} pixels wide!`,
				});

			return img;
		}),
	);

export const getFeaturedImagesSchema = () =>
	z.object({
		src: reference('images'),
		title: z.string().optional(),
		contentId: z.string().optional(), // Optional reference to the content associated with an image
	});
