import { imageLoader } from '@spectralcodex/image-loader';
import { hash } from '@spectralcodex/shared/cache';
import { getSqliteCacheInstance } from '@spectralcodex/shared/cache/sqlite';
import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { defineCollection } from 'astro:content';
import {
	CONTENT_MEDIA_PATH,
	CUSTOM_CACHE_PATH,
	IPX_SERVER_SECRET,
	IPX_SERVER_URL,
} from 'astro:env/server';
import { getSwatches } from 'colorthief';
import { ExifTool } from 'exiftool-vendored';
import sharp from 'sharp';
import { z } from 'zod';

import type { ImagePaletteSwatch } from '#lib/image/image-types.ts';

import { IMAGE_FORMAT, IMAGE_QUALITY } from '#constants.ts';
import { createIpxImageUrlFunction } from '#lib/image/image-server.ts';
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

const ImagePaletteSwatchSchema = z.object({
	hex: z.string(),
	label: z.string(),
	proportion: z.number(),
});

const ImageMetadataSchema = ImageExifDataSchema.extend({
	src: z.string(),
	path: z.string(),
	width: z.number(),
	height: z.number(),
	palette: z.array(ImagePaletteSwatchSchema).optional(),
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
	palette?: Array<ImagePaletteSwatch>;
}

const imageMetadataCache = getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'image-metadata');

async function getImageDimensions(imageObject: sharp.Sharp) {
	const metadata = await imageObject.metadata();

	return { width: metadata.width, height: metadata.height };
}

const PALETTE_RESIZE_WIDTH = 1000;

function toKebabCase(str: string) {
	return str.replaceAll(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

async function extractPalette(imageObject: sharp.Sharp): Promise<Array<ImagePaletteSwatch>> {
	try {
		const buffer = await imageObject.resize(PALETTE_RESIZE_WIDTH).toBuffer();
		const swatches = await getSwatches(buffer);

		return Object.entries(swatches)
			.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null)
			.map(([key, swatch]) => ({
				hex: swatch.color.hex(),
				label: toKebabCase(key),
				proportion: swatch.color.proportion,
			}))
			.sort((a, b) => b.proportion - a.proportion);
	} catch (error) {
		console.warn(`Failed to extract palette from image:`, error);

		return [];
	}
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

// This function is used to set a sensible default for the image URL
const getIpxImageUrl = createIpxImageUrlFunction({
	imageQuality: IMAGE_QUALITY,
	imageFormat: IMAGE_FORMAT,
	serverSecret: IPX_SERVER_SECRET,
	serverUrl: import.meta.env.PROD ? IPX_SERVER_URL : 'http://localhost:3100',
});

// Initialize ExifTool instance so it can be reused
let exiftool: ExifTool;

export const images = defineCollection({
	loader: imageLoader({
		base: CONTENT_MEDIA_PATH,
		concurrency: 40,
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
			let palette: Array<ImagePaletteSwatch> = [];

			if (cached) {
				dimensions = { width: cached.width, height: cached.height };

				if (cached.exif) exif = cached.exif;
				if (cached.palette) palette = cached.palette;
			} else {
				const imageObject = sharp(filePathRelative);

				dimensions = await getImageDimensions(imageObject);
				palette = await extractPalette(imageObject);

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
					palette,
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
				palette: [] as Array<ImagePaletteSwatch>,
			};

			return {
				...defaultMetadata,
				...dimensions,
				...exif,
				palette,
			} satisfies ImageMetadataInput;
		},
	}),
	schema: ImageMetadataSchema.strict(),
});
