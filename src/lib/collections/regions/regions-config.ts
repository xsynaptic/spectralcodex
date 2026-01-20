import { GeometryBoundingBoxSchema, GeometryDivisionIdSchema } from '@spectralcodex/map-types';
import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { RegionLanguageMap } from '#lib/collections/regions/regions-types.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { ImageFeaturedSchema } from '#lib/image/image-featured.ts';
import { DateStringSchema, NumericScaleSchema, StylizedTextSchema } from '#lib/schemas/index.ts';
import { LinkSchema } from '#lib/schemas/resources.ts';

export const regions = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/regions` }),
	schema: z
		.object({
			slug: z.string(),
			title: StylizedTextSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			parent: z.string().optional(),
			links: LinkSchema.array().optional(),
			dateCreated: DateStringSchema,
			dateUpdated: DateStringSchema.optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			divisionId: GeometryDivisionIdSchema,
			divisionSelectionBBox: GeometryBoundingBoxSchema.optional(),
			divisionClippingBBox: GeometryBoundingBoxSchema.optional(),
			hideDivision: z.boolean().optional(),
			entryQuality: NumericScaleSchema,
			/** Derived properties, for internal use only! */
			ancestors: z.string().array().optional(),
			siblings: z.string().array().optional(),
			children: z.string().array().optional(),
			descendants: z.string().array().optional(),
			locations: z.string().array().optional(),
			locationCount: z.number().int().optional(),
			posts: z.string().array().optional(),
			postCount: z.number().int().optional(),
			langCode: z.enum(RegionLanguageMap).optional(),
			hideSearch: z.boolean().optional(),
		})
		.strict(),
});
