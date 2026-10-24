import { LocationCategoryEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { entrySchemaFields } from '#lib/collections/collections-schemas.ts';
import { LocationTwHeritageSchema } from '#lib/collections/locations/locations-schemas.ts';
import { createMultilingualSchemas, titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { GeometryPointsArraySchema, GeometryPointsSchema } from '#lib/schemas/geometry.ts';
import { DateRecordedSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const locations = defineCollection({
	loader: createEntryGlobLoader('locations', { flatIds: true }),
	schema: z
		.object({
			...entrySchemaFields,
			address: z.string().optional(),
			category: z.enum(LocationCategoryEnum),
			heritage: LocationTwHeritageSchema.optional(),
			links: LinkSchema.array().optional(),
			mood: z.enum(['light', 'neutral', 'dark']).default('neutral'),
			notes: z.string().optional(),
			regions: reference('regions').array().min(1),
			sources: SourceSchema.array().optional(),
			status: z.enum(LocationStatusEnum),
			themes: reference('themes').array().optional(),
			...createMultilingualSchemas('address'),
			dateRecorded: DateRecordedSchema.optional(),
			geometry: z.union([GeometryPointsSchema, GeometryPointsArraySchema]),
			hideFromLists: z.boolean().optional(), // Exclude from index/listing surfaces; page remains accessible
			hideGeometry: z.boolean().optional(), // Do not show this location on any map
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
					regions: reference('regions').array().min(1).optional(),
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
