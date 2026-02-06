import { GeometryBoundingBoxSchema, GeometryDivisionIdSchema } from '@spectralcodex/shared/map';
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { RegionLanguageMap } from '#lib/collections/regions/regions-types.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
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
			hideSearch: z.boolean().optional(),
			entryQuality: NumericScaleSchema,
			/** Computed properties, for internal use only! */
			_ancestors: z.string().array().optional(),
			_siblings: z.string().array().optional(),
			_children: z.string().array().optional(),
			_descendants: z.string().array().optional(),
			_locations: z.string().array().optional(),
			_locationCount: z.number().int().optional(),
			_posts: z.string().array().optional(),
			_postCount: z.number().int().optional(),
			_langCode: z.enum(RegionLanguageMap).optional(),
		})
		.strict(),
});
