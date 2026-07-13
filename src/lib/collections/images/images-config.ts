import type { ImageLoaderCache, ImageLoaderCacheValue } from '@spectralcodex/astro-image-loader';

import { defineImageCollection } from '@spectralcodex/astro-image-loader';
import { hash } from '@spectralcodex/shared/cache';
import { getSqliteCacheInstance } from '@spectralcodex/shared/cache/sqlite';
import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { defineCollection } from 'astro:content';
import {
	CONTENT_MEDIA_PATH,
	CUSTOM_CACHE_PATH,
	IMAGE_SERVER_SECRET,
	IMAGE_SERVER_URL,
} from 'astro:env/server';
import { ExifTool } from 'exiftool-vendored';
import sharp from 'sharp';
import { z } from 'zod';

import { IMAGE_HQ_FORMAT, IMAGE_HQ_QUALITY } from '#constants.ts';
import { createSignedImagePathFunction } from '#lib/image/image-server.ts';
import { ImageSizeEnum } from '#lib/image/image-types.ts';
import { PositionSchema } from '#lib/schemas/geometry.ts';

const ImageExifDataSchema = z.object({
	title: z.string(),
	description: z.string(),
	dateCreated: z.coerce.date().optional(),
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

// Rebuilding EXIF data is slow, so dataHandler output is cached outside the Astro store
// The loader orchestrates; sqlite in ./.cache survives both store wipes and node_modules reinstalls
const imageMetadataCache = getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'image-metadata');

const imageLoaderCache = {
	get: (key: string) => imageMetadataCache.get<ImageLoaderCacheValue>(key),
	set: async (key: string, value: ImageLoaderCacheValue) => {
		await imageMetadataCache.set(key, value);
	},
	prune: (liveKeys: Array<string>) => {
		imageMetadataCache.prune(liveKeys);
	},
} satisfies ImageLoaderCache;

// Schema changes invalidate both the store digest and the cached dataHandler output automatically
// Bump rev for logic-only changes; coerced/transformed fields are unrepresentable in JSON Schema and also need a rev bump
// Env inputs participate because cached output embeds signed image URLs
const invalidationKey = hash({
	schema: z.toJSONSchema(ImageMetadataSchema, { unrepresentable: 'any' }),
	env: { IMAGE_SERVER_URL, IMAGE_SERVER_SECRET, IMAGE_HQ_FORMAT, IMAGE_HQ_QUALITY },
	rev: 1,
});

// Extract image dimensions from the image object
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

// Coerce an EXIF tag to a string, preserving absence as undefined
// String(undefined) yields the literal "undefined", which would poison fallbacks
function getTagString(value: string | number | boolean | null | undefined): string | undefined {
	return value === undefined || value === null ? undefined : String(value);
}

// Extract a selection of EXIF data from the image
async function extractExifData(
	filePathRelative: string,
	exiftool: ExifTool,
): Promise<ImageExifDataInput> {
	const tags = await exiftool.read(filePathRelative);

	const dateCreated = tags.DateCreated ? tags.DateCreated.toString() : undefined;
	const aperture = getTagString(tags.FNumber);
	const shutterSpeed = getTagString(tags.ShutterSpeed);

	return {
		title: getTagString(tags.Title) ?? '',
		description: getTagString(tags.Description) ?? '',
		dateCreated: dateCreated ? new Date(dateCreated).toISOString() : undefined,
		brand: getTagString(tags.Make),
		camera: getTagString(tags.Model),
		lens: tags.LensID ?? getTagString(tags.LensModel),
		aperture,
		shutterSpeed,
		focalLength: getTagString(tags.FocalLength),
		iso: getTagString(tags.ISO),
		exposureValue: getImageExposureValue({ aperture, shutterSpeed }),
		...(tags.GPSLatitude && tags.GPSLongitude
			? {
					geometry: {
						type: GeometryTypeEnum.Point,
						coordinates: [Number(tags.GPSLongitude), Number(tags.GPSLatitude)],
					},
				}
			: {}),
	};
}

// Images collection stores a full URL in `src` for OG image generation (Satori requires absolute URLs)
const getSignedImagePath = createSignedImagePathFunction({
	imageQuality: IMAGE_HQ_QUALITY,
	imageFormat: IMAGE_HQ_FORMAT,
	serverSecret: IMAGE_SERVER_SECRET,
});

// Initialize ExifTool instance so it can be reused
let exiftool: ExifTool;

export const images = defineCollection(
	defineImageCollection({
		base: CONTENT_MEDIA_PATH,
		concurrency: 80,
		invalidationKey,
		cache: imageLoaderCache,
		schema: ImageMetadataSchema.strict(),
		beforeLoad: () => {
			exiftool = new ExifTool({ ignoreZeroZeroLatLon: true, taskTimeoutMillis: 30_000 });
		},
		afterLoad: async () => {
			await exiftool.end();
		},
		dataHandler: async ({ id, filePathRelative }) => {
			const dimensions = await getImageDimensions(filePathRelative);
			const exif = await extractExifData(filePathRelative, exiftool);

			// Clamp source width to avoid upscaling
			const srcWidth = Math.min(1800, dimensions.width);
			const defaultAspectRatio = 3 / 2;

			const defaultMetadata = {
				src: `${IMAGE_SERVER_URL}${getSignedImagePath(id, { width: srcWidth })}`,
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
);
