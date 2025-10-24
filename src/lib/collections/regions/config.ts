import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { RegionLanguageMap } from '#lib/collections/regions/types.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { ImageFeaturedSchema } from '#lib/image/image-featured.ts';
import { DateStringSchema, NumericScaleSchema, StylizedStringSchema } from '#lib/schemas/index.ts';
import { LinkSchema } from '#lib/schemas/links.ts';

export const regions = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/regions` }),
	schema: z
		.object({
			slug: z.string(),
			title: StylizedStringSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			parent: reference('regions').optional(),
			links: LinkSchema.array().optional(),
			dateCreated: DateStringSchema.optional(),
			dateUpdated: DateStringSchema.optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			divisionId: z.union([z.string(), z.string().array()]).nullable(),
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
			langCode: z.nativeEnum(RegionLanguageMap).optional(),
			hideSearch: z.boolean().optional(),
		})
		.strict(),
});
