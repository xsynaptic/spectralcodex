import { imageLoader } from '@spectralcodex/image-loader';
import { hash } from '@spectralcodex/shared/cache';
import { getSqliteCacheInstance } from '@spectralcodex/shared/cache/sqlite';
import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { defineCollection } from 'astro:content';
import { CONTENT_MEDIA_PATH, CUSTOM_CACHE_PATH } from 'astro:env/server';
import { ExifTool } from 'exiftool-vendored';
import sharp from 'sharp';
import { z } from 'zod';

import { getIpxImageUrl } from '#lib/image/image-server.ts';
import { ImageSizeEnum } from '#lib/image/image-types.ts';
import { PositionSchema } from '#lib/schemas/geometry.ts';
import { DateStringSchema } from '#lib/schemas/index.ts';

const ImageExifDataSchema = z.object({
	title: z.string(),
	description: z.string(),
	dateCreated: DateStringSchema.optional(),
	brand: z.string().optional(),
	camera: z.string().optional(),
	lens: z.string().optional(),
	aperture: z.string().optional(),
	shutterSpeed: z.string().optional(),
	focalLength: z.string().optional(),
	iso: z.string().optional(),
	exposureValue: z.string().optional(),
	geometry: z
		.object({
			type: z.literal(GeometryTypeEnum.Point),
			coordinates: PositionSchema,
		})
		.optional(),
});

type ImageExifDataInput = z.input<typeof ImageExifDataSchema>;

const ImageMetadataSchema = ImageExifDataSchema.extend({
	src: z.string(),
	path: z.string(),
	width: z.number(),
	height: z.number(),
	modifiedTime: z.date().optional(),
});

type ImageMetadataInput = z.input<typeof ImageMetadataSchema>;

/**
 * Image metadata schema
 * Astro caches everything in the data store but rebuilding EXIF data is slow so we cache it here as well
 * This allows for use to rebuild Astro's content cache as needed without taking several extra minutes
 * If your image library shifts around or changes a lot you can nuke the sqlite file in the cache folder
 */
interface ImageMetadataCached {
	width: number;
	height: number;
	exif?: ImageExifDataInput | undefined;
}

const imageMetadataCache = getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'image-metadata');

// Read a local image with Sharp and return dimension metrics
async function getImageDimensions(imagePath: string) {
	const metadata = await sharp(imagePath).metadata();

	return { width: metadata.width, height: metadata.height };
}

// Calculate EV using the formula EV = log2(N^2 / t)
function getImageExposureValue({
	aperture,
	shutterSpeed,
}: {
	aperture: string | undefined;
	shutterSpeed: string | undefined;
}) {
	if (!aperture || !shutterSpeed) return;

	let shutterTime: number;

	if (shutterSpeed.includes('/')) {
		const [numerator, denominator] = shutterSpeed.split('/').map(Number);

		if (!numerator || !denominator) return;

		shutterTime = numerator / denominator;
	} else {
		shutterTime = Number(shutterSpeed);
	}

	return String(Math.log2(Number(aperture) ** 2 / shutterTime));
}

// Initialize ExifTool instance so it can be reused
let exiftool: ExifTool;

export const images = defineCollection({
	loader: imageLoader({
		base: CONTENT_MEDIA_PATH,
		concurrency: 100,
		beforeLoad: () => {
			exiftool = new ExifTool({ ignoreZeroZeroLatLon: true });
		},
		afterLoad: async () => {
			await exiftool.end();
		},
		dataHandler: async ({ id, filePathRelative, modifiedTime }) => {
			const cacheKey = hash({ filePath: filePathRelative, mtime: modifiedTime });
			const cached = await imageMetadataCache.get<ImageMetadataCached>(cacheKey);

			let dimensions: { width: number; height: number };
			let exif: ImageExifDataInput | undefined;

			if (cached) {
				dimensions = { width: cached.width, height: cached.height };

				if (cached.exif) {
					exif = cached.exif;
				}
			} else {
				dimensions = await getImageDimensions(filePathRelative);

				const tags = await exiftool.read(filePathRelative);

				const dateCreated = tags.DateCreated ? tags.DateCreated.toString() : undefined;

				exif = {
					title: String(tags.Title),
					description: String(tags.Description),
					dateCreated: dateCreated ? new Date(dateCreated).toISOString() : undefined,
					brand: String(tags.Make),
					camera: String(tags.Model),
					lens: tags.LensID ?? String(tags.LensModel),
					aperture: String(tags.FNumber),
					shutterSpeed: String(tags.ShutterSpeed),
					focalLength: String(tags.FocalLength),
					iso: String(tags.ISO),
					exposureValue: getImageExposureValue({
						aperture: String(tags.FNumber),
						shutterSpeed: String(tags.ShutterSpeed),
					}),
					...(tags.GPSLatitude && tags.GPSLongitude
						? {
								geometry: {
									type: GeometryTypeEnum.Point,
									coordinates: [Number(tags.GPSLongitude), Number(tags.GPSLatitude)],
								},
							}
						: {}),
				};

				await imageMetadataCache.set(cacheKey, {
					...dimensions,
					exif,
				} satisfies ImageMetadataCached);
			}

			// Clamp source width to avoid upscaling
			const srcWidth = Math.min(1800, dimensions.width);
			const defaultAspectRatio = 3 / 2;

			const defaultMetadata = {
				src: getIpxImageUrl(id, {
					width: srcWidth,
					sourceWidth: dimensions.width,
					sourceHeight: dimensions.height,
				}),
				path: filePathRelative,
				width: ImageSizeEnum.Large,
				height: Math.round(ImageSizeEnum.Large / defaultAspectRatio),
				title: '',
				description: '',
			};

			return {
				...defaultMetadata,
				...dimensions,
				...exif,
			} satisfies ImageMetadataInput;
		},
	}),
	schema: ImageMetadataSchema.strict(),
});
