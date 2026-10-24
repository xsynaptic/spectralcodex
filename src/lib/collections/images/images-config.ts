import { ImageSizeEnum } from '@spectralcodex/shared/images';
import { createJsonlCache, defineImageCollection } from '@xsynaptic/astro-image-loader';
import { defineCollection } from 'astro:content';
import { CONTENT_MEDIA_PATH, CUSTOM_CACHE_PATH } from 'astro:env/server';
import { ExifTool } from 'exiftool-vendored';
import path from 'node:path';
import { hash } from 'ohash';
import sharp from 'sharp';
import { z } from 'zod';

import { extractExifData, ImageExifDataSchema } from '#lib/collections/images/images-exif.ts';

const ImageMetadataSchema = ImageExifDataSchema.extend({
	height: z.number(),
	modifiedTime: z.date().optional(),
	path: z.string(),
	src: z.string(),
	width: z.number(),
});

type ImageMetadataInput = z.input<typeof ImageMetadataSchema>;

// EXIF extraction is slow; a JSONL cache in ./.cache survives store wipes and node_modules reinstalls
// Explicit filePath because the package default lives under node_modules/.astro
const imageLoaderCache = createJsonlCache({
	filePath: path.join(CUSTOM_CACHE_PATH, 'image-metadata.jsonl'),
});

// Schema shape versions the cached payload; bump rev for changes invisible to z.toJSONSchema (coercions, extraction logic)
const extractionVersion = hash({
	rev: 2,
	schema: z.toJSONSchema(ImageMetadataSchema, { unrepresentable: 'any' }),
});

// Extract image dimensions from the image object
async function getImageDimensions(imagePath: string) {
	const metadata = await sharp(imagePath).metadata();

	return { height: metadata.height, width: metadata.width };
}

// Initialize ExifTool instance so it can be reused
let exiftool: ExifTool;

export const images = defineCollection(
	defineImageCollection({
		afterLoad: async () => {
			await exiftool.end();
		},
		base: CONTENT_MEDIA_PATH,
		beforeLoad: () => {
			exiftool = new ExifTool({ ignoreZeroZeroLatLon: true, taskTimeoutMillis: 30_000 });
		},
		cache: imageLoaderCache,
		concurrency: 80,
		dataHandler: async ({ filePathRelative }) => {
			const dimensions = await getImageDimensions(filePathRelative);
			const exif = await extractExifData(filePathRelative, exiftool);

			const defaultAspectRatio = 3 / 2;

			// Intrinsic data only; env-dependent values would poison the cross-context cache
			const defaultMetadata = {
				description: '',
				height: Math.round(ImageSizeEnum.Large / defaultAspectRatio),
				path: filePathRelative,
				title: '',
				width: ImageSizeEnum.Large,
			};

			// The loader injects src (root-relative path) and modifiedTime before parsing
			return {
				...defaultMetadata,
				...dimensions,
				...exif,
			} satisfies Omit<ImageMetadataInput, 'src'>;
		},
		extractionVersion,
		schema: ImageMetadataSchema.strict(),
		showProgress: true,
	}),
);
