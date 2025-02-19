import { imageLoader } from '@spectralcodex/image-loader';
import { defineCollection, z } from 'astro:content';
import sharp from 'sharp';

import { CONTENT_MEDIA_HOST, CONTENT_MEDIA_PATH } from '@/constants';

const ImageMetadataSchema = z.object({
	src: z.string(),
	path: z.string(),
	width: z.number(),
	height: z.number(),
	modifiedTime: z.date().optional(),
	placeholder: z.string().optional(),
});

type ImageMetadataInput = z.input<typeof ImageMetadataSchema>;

async function getImageDimensions(imagePath: string) {
	const metadata = await sharp(imagePath).metadata();

	return { width: metadata.width, height: metadata.height };
}

export const images = defineCollection({
	loader: imageLoader({
		base: CONTENT_MEDIA_PATH,
		concurrency: 80,
		dataHandler: async ({ id, filePathRelative }) => {
			const dimensions = await getImageDimensions(filePathRelative);

			return {
				src: `${CONTENT_MEDIA_HOST}/${id}`,
				path: filePathRelative,
				...Object.assign({ width: 1200, height: 900 }, dimensions),
			} satisfies ImageMetadataInput;
		},
	}),
	schema: ImageMetadataSchema.strict(),
});
