import type { Tags } from 'exiftool-vendored';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { z } from 'zod';

import { PositionSchema } from '#lib/schemas/geometry.ts';

export const ImageExifDataSchema = z.object({
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

// Calculate EV using the formula EV = log2(N^2 / t)
export function getImageExposureValue({
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

	const exposureValue = Math.log2(Number(aperture) ** 2 / shutterTime);

	return Number.isFinite(exposureValue) ? String(exposureValue) : undefined;
}

// Coerce an EXIF tag to a string, preserving absence as undefined
// String(undefined) yields the literal "undefined", which would poison fallbacks
function getTagString(value: string | number | boolean | null | undefined): string | undefined {
	return value === undefined || value === null ? undefined : String(value);
}

// Extract a selection of EXIF data from the image
export async function extractExifData(
	filePathRelative: string,
	exiftool: { read: (filePath: string) => Promise<Tags> },
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
