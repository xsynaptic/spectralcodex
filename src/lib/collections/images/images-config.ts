import { hash } from '@spectralcodex/shared/cache';
import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { createJsonlCache, defineImageCollection } from '@xsynaptic/astro-image-loader';
import { defineCollection } from 'astro:content';
import {
	CONTENT_MEDIA_PATH,
	CUSTOM_CACHE_PATH,
	IMAGE_SERVER_SECRET,
	IMAGE_SERVER_URL,
} from 'astro:env/server';
import { ExifTool } from 'exiftool-vendored';
import path from 'node:path';
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

// EXIF extraction is slow; a JSONL cache in ./.cache survives store wipes and node_modules reinstalls
// Explicit filePath because the package default lives under node_modules/.astro
const imageLoaderCache = createJsonlCache({
	filePath: path.join(CUSTOM_CACHE_PATH, 'image-metadata.jsonl'),
});

// Schema shape versions the cached payload; bump rev for changes invisible to z.toJSONSchema (coercions, extraction logic)
const extractionVersion = hash({
	schema: z.toJSONSchema(ImageMetadataSchema, { unrepresentable: 'any' }),
	rev: 1,
});

// Env feeds the src transform; changes re-derive entries without re-running exiftool
const derivationVersion = hash({
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

// Replaces the loader-injected src (root-relative path) with the signed URL
const ImageCollectionSchema = ImageMetadataSchema.strict().transform((data) => ({
	...data,
	src: `${IMAGE_SERVER_URL}${getSignedImagePath(
		path.posix.relative(CONTENT_MEDIA_PATH, data.path),
		{
			// Clamp source width to avoid upscaling
			width: Math.min(1800, data.width),
		},
	)}`,
}));

// Initialize ExifTool instance so it can be reused
let exiftool: ExifTool;

export const images = defineCollection(
	defineImageCollection({
		base: CONTENT_MEDIA_PATH,
		concurrency: 80,
		extractionVersion,
		derivationVersion,
		showProgress: true,
		cache: imageLoaderCache,
		schema: ImageCollectionSchema,
		beforeLoad: () => {
			exiftool = new ExifTool({ ignoreZeroZeroLatLon: true, taskTimeoutMillis: 30_000 });
		},
		afterLoad: async () => {
			await exiftool.end();
		},
		dataHandler: async ({ filePathRelative }) => {
			const dimensions = await getImageDimensions(filePathRelative);
			const exif = await extractExifData(filePathRelative, exiftool);

			const defaultAspectRatio = 3 / 2;

			// Intrinsic data only; env-dependent values would poison the cross-context cache
			const defaultMetadata = {
				path: filePathRelative,
				width: ImageSizeEnum.Large,
				height: Math.round(ImageSizeEnum.Large / defaultAspectRatio),
				title: '',
				description: '',
			};

			// The loader injects src (root-relative path) and modifiedTime before parsing
			return {
				...defaultMetadata,
				...dimensions,
				...exif,
			} satisfies Omit<ImageMetadataInput, 'src'>;
		},
	}),
);
