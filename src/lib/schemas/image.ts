import type { ImageFunction } from 'astro:content';

import { z } from 'astro:content';

import { CONTENT_IMAGE_FEATURED_MIN_WIDTH } from '@/constants';

interface GetImageTransformBaseParams {
	imageFunction: ImageFunction;
}

type GetImageTransformExtendedParams = GetImageTransformBaseParams & {
	defaultPath?: string;
	minWidth?: number;
};

// This function handles image size validation and adds a default path to the image `src` where needed
export function getLocalImageTransformFunction({
	imageFunction,
	minWidth = CONTENT_IMAGE_FEATURED_MIN_WIDTH,
}: GetImageTransformExtendedParams) {
	return z.string().pipe(
		imageFunction().transform((img, ctx) => {
			if (img.width <= minWidth)
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Preview image must be at least ${String(minWidth)} pixels wide!`,
				});

			return img;
		}),
	);
}

export const FeaturedImagesSchema = z.object({
	src: z.string().optional(),
	title: z.string().optional(),
	contentId: z.string().optional(), // Optional reference to the content associated with an image
});
