import type { ImageFunction } from 'astro:content';

import { z } from 'zod';

import { CONTENT_IMAGE_FEATURED_MIN_WIDTH } from '#constants.ts';

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

// For use in regions, series, and themes
export const ImageSetSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	link: z.string().optional(), // Functions just like a Link component in MDX content
});

export type ImageSet = z.infer<typeof ImageSetSchema>;

export const ImageThumbnailSchema = z.object({
	src: z.string(),
	srcSet: z.string(),
	height: z.string(),
	width: z.string(),
});

export type ImageThumbnail = z.infer<typeof ImageThumbnailSchema>;
