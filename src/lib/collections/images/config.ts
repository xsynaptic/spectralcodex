import { imageLoader } from '@spectralcodex/image-loader';
import { defineCollection, z } from 'astro:content';
import { ExifTool } from 'exiftool-vendored';

import { CONTENT_MEDIA_PATH, FEATURE_IMAGE_METADATA } from '@/constants';
import {
	getImageExposureValue,
	getImagePlaceholder,
	getImageTitle,
} from '@/lib/image/image-loader-utils';
import { GeometrySchema } from '@/lib/schemas/geometry';
import { getImageTransformFunction } from '@/lib/schemas/image';

const ImageMetadataSchema = z.object({
	title: z.string().optional(),
	titleAlt: z.string().optional(),
	titleRaw: z.string().optional(),
	dateCaptured: z.date().optional(),
	brand: z.string().optional(),
	camera: z.string().optional(),
	lens: z.string().optional(),
	aperture: z.string().optional(),
	shutterSpeed: z.string().optional(),
	focalLength: z.string().optional(),
	iso: z.string().optional(),
	exposureValue: z.string().optional(),
	geometry: GeometrySchema.optional(),
	placeholder: z.string().optional(),
});

type ImageMetadataInput = z.input<typeof ImageMetadataSchema>;

let exiftool: ExifTool;

export const images = defineCollection({
	loader: imageLoader({
		base: CONTENT_MEDIA_PATH,
		concurrency: 80,
		dataHandler: async ({ filePathRelative, fileUrl, logger }) => {
			const placeholder = await getImagePlaceholder({ fileUrl, logger });

			const metadata = FEATURE_IMAGE_METADATA
				? await (async () => {
						const tags = await exiftool.read(filePathRelative);

						const dateCaptured = tags.DateCreated ? tags.DateCreated.toString() : undefined;

						return {
							...getImageTitle(tags.Title),
							titleRaw: String(tags.Title),
							dateCaptured: dateCaptured ? new Date(dateCaptured) : undefined,
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
											type: 'Point' as const,
											coordinates: [Number(tags.GPSLongitude), Number(tags.GPSLatitude)] as [
												number,
												number,
											],
										},
									}
								: {}),
						};
					})()
				: {};

			return {
				placeholder,
				...metadata,
			} satisfies ImageMetadataInput;
		},
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
	}),
	schema: ({ image }) =>
		ImageMetadataSchema.extend({
			src: getImageTransformFunction({ image, defaultPath: '' }),
			modifiedTime: z.date().optional(),
		}).strict(),
});
