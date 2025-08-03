import { imageLoader } from '@spectralcodex/image-loader';
import { GeometryTypeEnum } from '@spectralcodex/map-types';
import { defineCollection, z } from 'astro:content';
import { ExifTool } from 'exiftool-vendored';
import sharp from 'sharp';

import { CONTENT_MEDIA_HOST, CONTENT_MEDIA_PATH, FEATURE_IMAGE_METADATA } from '#constants.ts';
import {
	getImageExposureValue,
	getImageFileUrlPlaceholder,
} from '#lib/image/image-loader-utils.ts';
import { GeometryPointsSchema } from '#lib/schemas/geometry.ts';
import { NumericScaleSchema } from '#lib/schemas/index.ts';

const ImageBaseSchema = z.object({
	src: z.string(),
	path: z.string(),
	width: z.number(),
	height: z.number(),
	modifiedTime: z.date().optional(),
});

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
	geometry: GeometryPointsSchema.optional(),
	entryQuality: NumericScaleSchema,
});

const ImageMetadataSchema = ImageBaseSchema.merge(ImageExifDataSchema).extend({
	placeholder: z.string().optional(),
});

let exiftool: ExifTool;

type ImageMetadataInput = z.input<typeof ImageMetadataSchema>;

// Read a local image with Sharp and return dimension metrics
async function getImageDimensions(imagePath: string) {
	const metadata = await sharp(imagePath).metadata();

	return { width: metadata.width, height: metadata.height };
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
					afterLoad: () => {
						void exiftool.end();
					},
				}
			: {}),
		dataHandler: async ({ logger, id, filePathRelative, fileUrl }) => {
			const defaultMetadata = {
				src: `${CONTENT_MEDIA_HOST}/${id}`,
				path: filePathRelative,
				width: 1200,
				height: 900,
				title: '',
				description: '',
				entryQuality: 1,
			};

			/**
			 * We save dimensions to the content collection so we can reference locally hosted images without `inferSize`
			 */
			const dimensions = await getImageDimensions(filePathRelative);

			/**
			 * Harvest EXIF data from images
			 */
			const exifData = FEATURE_IMAGE_METADATA
				? await (async () => {
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
							lens: tags.LensID ? String(tags.LensID) : String(tags.LensModel),
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
											coordinates: [Number(tags.GPSLongitude), Number(tags.GPSLatitude)] as [
												number,
												number,
											],
										},
									}
								: {}),
							entryQuality,
						};
					})()
				: {};

			/**
			 * Generate a low-quality placeholder (LQIP) for the image
			 * This is base 64-encoded and stored in the content collection for easy reference
			 */
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
				...defaultMetadata,
				...dimensions,
				...exifData,
				placeholder,
			} satisfies ImageMetadataInput;
		},
	}),
	schema: ImageMetadataSchema.strict(),
});
