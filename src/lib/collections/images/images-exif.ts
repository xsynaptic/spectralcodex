import type { Tags } from 'exiftool-vendored';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { z } from 'zod';

import { PositionSchema } from '#lib/schemas/geometry.ts';

export const ImageExifDataSchema = z.object({
	aperture: z.string().optional(),
	brand: z.string().optional(),
	camera: z.string().optional(),
	dateCreated: z.coerce.date().optional(),
	description: z.string(),
	exposureValue: z.string().optional(),
	focalLength: z.string().optional(),
	geometry: z
		.object({
			coordinates: PositionSchema,
			type: z.literal(GeometryTypeEnum.Point),
		})
		.optional(),
	iso: z.string().optional(),
	lens: z.string().optional(),
	shutterSpeed: z.string().optional(),
	title: z.string(),
});

type ImageExifDataInput = z.input<typeof ImageExifDataSchema>;

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
		aperture,
		brand: getTagString(tags.Make),
		camera: getTagString(tags.Model),
		dateCreated: dateCreated ? new Date(dateCreated).toISOString() : undefined,
		description: getTagString(tags.Description) ?? '',
		exposureValue: getImageExposureValue({ aperture, shutterSpeed }),
		focalLength: getTagString(tags.FocalLength),
		iso: getTagString(tags.ISO),
		lens: tags.LensID ?? getTagString(tags.LensModel),
		shutterSpeed,
		title: getTagString(tags.Title) ?? '',
		...(tags.GPSLatitude && tags.GPSLongitude
			? {
					geometry: {
						coordinates: [Number(tags.GPSLongitude), Number(tags.GPSLatitude)],
						type: GeometryTypeEnum.Point,
					},
				}
			: {}),
	};
}

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
function getTagString(value: boolean | null | number | string | undefined): string | undefined {
	return value === undefined || value === null ? undefined : String(value);
}
