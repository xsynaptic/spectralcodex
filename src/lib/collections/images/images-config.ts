import { imageLoader } from '@spectralcodex/image-loader';
import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { defineCollection } from 'astro:content';
import { CONTENT_MEDIA_PATH } from 'astro:env/server';
import { ExifTool } from 'exiftool-vendored';
import sharp from 'sharp';
import { z } from 'zod';

import { FEATURE_IMAGE_METADATA } from '#constants.ts';
import { getIpxImageUrl } from '#lib/image/image-server.ts';
import { ImageSizeEnum } from '#lib/image/image-types.ts';
import { PositionSchema } from '#lib/schemas/geometry.ts';
import { NumericScaleSchema } from '#lib/schemas/index.ts';

const ImageExifDataSchema = z.object({
	title: z.string(),
	description: z.string(),
	dateCreated: z.date().optional(),
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
	entryQuality: NumericScaleSchema,
});

type ImageExifDataInput = z.input<typeof ImageExifDataSchema>;

const ImageMetadataSchema = ImageExifDataSchema.extend({
	src: z.string(),
	path: z.string(),
	width: z.number(),
	height: z.number(),
	modifiedTime: z.date().optional(),
});

let exiftool: ExifTool;

type ImageMetadataInput = z.input<typeof ImageMetadataSchema>;

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

export const images = defineCollection({
	loader: imageLoader({
		base: CONTENT_MEDIA_PATH,
		concurrency: 100,
		...(FEATURE_IMAGE_METADATA
			? {
					beforeLoad: () => {
						exiftool = new ExifTool({ ignoreZeroZeroLatLon: true });
					},
					afterLoad: async () => {
						await exiftool.end();
					},
				}
			: {}),
		dataHandler: async ({ id, filePathRelative }) => {
			/**
			 * We save dimensions to the content collection so we can reference locally hosted images without `inferSize`
			 */
			const dimensions = await getImageDimensions(filePathRelative);

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
				entryQuality: 1,
			};

			/**
			 * Harvest EXIF data from images
			 */
			async function getExifData() {
				if (!FEATURE_IMAGE_METADATA) return;

				const tags = await exiftool.read(filePathRelative);

				const dateCreated = tags.DateCreated ? tags.DateCreated.toString() : undefined;
				const entryQuality = Math.min(
					1,
					Math.max(Number.parseInt(String(tags.Rating ?? 0), 10), 5),
				);

				return {
					title: String(tags.Title),
					description: String(tags.Description),
					dateCreated: dateCreated ? new Date(dateCreated) : undefined,
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
					entryQuality,
				} satisfies ImageExifDataInput;
			}

			const exifData = await getExifData();

			return {
				...defaultMetadata,
				...dimensions,
				...exifData,
			} satisfies ImageMetadataInput;
		},
	}),
	schema: ImageMetadataSchema.strict(),
});
