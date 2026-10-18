import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { LocationTwHeritageSchema } from '#lib/collections/locations/locations-schemas.ts';
import { createMultilingualSchemas, titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { GeometryPointsSchema } from '#lib/schemas/geometry.ts';
import {
	DateRecordedSchema,
	DateSchema,
	NumericScaleSchema,
	TitleSchema,
} from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const locations = defineCollection({
	loader: createEntryGlobLoader('locations', { flatIds: true }),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			address: z.string().optional(),
			category: z.enum(LocationCategoryEnum),
			description: z.string().optional(),
			heritage: LocationTwHeritageSchema.optional(),
			links: LinkSchema.array().optional(),
			mood: z.enum(['light', 'neutral', 'dark']).default('neutral'),
			notes: z.string().optional(),
			regions: reference('regions').array().min(1),
			sources: SourceSchema.array().optional(),
			status: z.enum(LocationStatusEnum),
			themes: reference('themes').array().optional(),
			...createMultilingualSchemas('address'),
			dateCreated: DateSchema,
			dateRecorded: DateRecordedSchema.optional(),
			dateUpdated: DateSchema.optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			geometry: z.union([GeometryPointsSchema, GeometryPointsSchema.array()]),
			hideFromLists: z.boolean().optional(), // Exclude from index/listing surfaces; page remains accessible
			hideGeometry: z.boolean().optional(), // Do not show this location on any map
			imageFeatured: ImageFeaturedSchema.optional(),
			incomplete: z.boolean().optional(), // Only for personal reference
			objective: NumericScaleSchema.optional(), // Only for personal reference
			outlier: z.boolean().optional(), // Do not use this location to calculate bounding boxes
			// Override some properties for sensitive sites
			override: z
				.object({
					id: z.string().optional(),
					title: TitleSchema.optional(),
					...titleMultilingualSchema,
					description: z.string().optional(),
					regions: reference('regions').array().optional(),
				})
				.strict()
				.optional(),
			precision: NumericScaleSchema,
			rating: NumericScaleSchema,
			safety: NumericScaleSchema.optional(),
			skipCoordinateCheck: z.boolean().optional(), // Bypass region/coordinate validation
		})
		.strict()
		.refine((data) => data.override === undefined || data.hideGeometry === true, {
			message: 'An Override requires `hideGeometry: true`',
			path: ['override'],
		}),
});
