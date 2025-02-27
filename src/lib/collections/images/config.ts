import { imageLoader } from '@spectralcodex/image-loader';
import { defineCollection, z } from 'astro:content';
import sharp from 'sharp';

import { CONTENT_MEDIA_HOST, CONTENT_MEDIA_PATH } from '@/constants';
import { getImageFileUrlPlaceholder } from '@/lib/image/image-loader-utils';

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
		dataHandler: async ({ logger, id, filePathRelative, fileUrl }) => {
			const dimensions = await getImageDimensions(filePathRelative);

			const placeholder = await getImageFileUrlPlaceholder({
				fileUrl,
				onError: (errorMessage) => {
					logger.error(errorMessage);
				},
				onNotFound: (errorMessage) => {
					logger.warn(errorMessage);
				},
			});

			return {
				src: `${CONTENT_MEDIA_HOST}/${id}`,
				path: filePathRelative,
				...Object.assign({ width: 1200, height: 900 }, dimensions),
				placeholder,
			} satisfies ImageMetadataInput;
		},
	}),
	schema: ImageMetadataSchema.strict(),
});
