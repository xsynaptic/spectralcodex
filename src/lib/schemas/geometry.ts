import type { Position } from 'geojson';

import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/map-types';
import { z } from 'zod';

import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { getTruncatedLngLat } from '#lib/map/map-utils.ts';
import { ImageThumbnailSchema } from '#lib/schemas/image.ts';
import { DescriptionSchema, NumericScaleSchema, StylizedTextSchema } from '#lib/schemas/index.ts';
import { UrlSchema } from '#lib/schemas/index.ts';

function validateCoordinates(coordinates: [number, number]) {
	if (!coordinates[0] || !coordinates[1]) {
		return {
			code: 'custom' as const,
			input: coordinates,
			message: `Coordinates should be an array of two numbers.`,
		};
	}
	if (coordinates[0] < -180 || coordinates[0] > 180) {
		return {
			code: 'custom' as const,
			input: coordinates,
			message: `Longitude should be between 180 and -180; value was "${String(coordinates[0])}".`,
		};
	}
	if (coordinates[1] < -90 || coordinates[1] > 90) {
		return {
			code: 'custom' as const,
			input: coordinates,
			message: `Latitude should be between 90 and -90; value was "${String(coordinates[1])}".`,
		};
	}
	return;
}

export const PositionSchema = z.tuple([z.number(), z.number()]).transform((value, ctx) => {
	const issueData = validateCoordinates(value);

	if (issueData) {
		ctx.addIssue(issueData);
		return z.NEVER;
	}

	return getTruncatedLngLat(value) satisfies Position;
});

export const GeometryPointsSchema = z.object({
	coordinates: PositionSchema,
	title: StylizedTextSchema.optional(),
	...titleMultilingualSchema,
	description: DescriptionSchema.optional(),
	category: z.enum(LocationCategoryEnum).optional(),
	status: z.enum(LocationStatusEnum).optional(),
	precision: NumericScaleSchema.optional(),
	googleMapsUrl: UrlSchema.optional(),
	imageFeatured: z.string().nullable().optional(),
	/** Map properties, for internal use only! */
	imageThumbnail: ImageThumbnailSchema.nullable().optional(),
});

export const GeometryLinesSchema = z.object({
	coordinates: PositionSchema.array().min(2),
	rounded: z.boolean().optional(),
});
