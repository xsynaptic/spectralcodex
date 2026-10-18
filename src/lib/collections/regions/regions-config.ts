import { GeometryBoundingBoxSchema, GeometryDivisionIdSchema } from '@spectralcodex/shared/map';
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { DateSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { LinkSchema } from '#lib/schemas/resources.ts';

export const regions = defineCollection({
	loader: createEntryGlobLoader('regions', { flatIds: true }),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			dateCreated: DateSchema,
			dateUpdated: DateSchema.optional(),
			description: z.string().optional(),
			divisionClippingBBox: GeometryBoundingBoxSchema.optional(),
			divisionId: GeometryDivisionIdSchema,
			divisionSelectionBBox: GeometryBoundingBoxSchema.optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			hideDivision: z.boolean().optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			links: LinkSchema.array().optional(),
			parent: z.string().optional(),
		})
		.strict(),
});
