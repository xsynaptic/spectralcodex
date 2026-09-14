import { GeometryBoundingBoxSchema, GeometryDivisionIdSchema } from '@spectralcodex/shared/map';
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { RegionLanguageMap } from '#lib/collections/regions/regions-types.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { DateSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { LinkSchema } from '#lib/schemas/resources.ts';

export const regions = defineCollection({
	loader: createEntryGlobLoader('regions', { flatIds: true }),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			_ancestors: z.string().array().optional(),
			_children: z.string().array().optional(),
			_entryCount: z.number().int().optional(),
			_langCode: z.enum(RegionLanguageMap).optional(),
			_locationCount: z.number().int().optional(),
			_locations: z.string().array().optional(),
			_postCount: z.number().int().optional(),
			_posts: z.string().array().optional(),
			_siblings: z.string().array().optional(),
			dateCreated: DateSchema,
			dateUpdated: DateSchema.optional(),
			description: z.string().optional(),
			divisionClippingBBox: GeometryBoundingBoxSchema.optional(),
			divisionId: GeometryDivisionIdSchema,
			divisionSelectionBBox: GeometryBoundingBoxSchema.optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			hideDivision: z.boolean().optional(),
			hideSearch: z.boolean().optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			links: LinkSchema.array().optional(),
			parent: z.string().optional(),
		})
		.strict(),
});
