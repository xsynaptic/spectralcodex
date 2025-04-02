import { glob } from 'astro/loaders';
import { defineCollection, reference, z } from 'astro:content';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { DateStringSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/content.ts';
import { ImageSetSchema } from '#lib/schemas/image.ts';
import { LinkSchema } from '#lib/schemas/links.ts';

export const regions = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/regions` }),
	schema: z
		.object({
			slug: z.string(),
			title: TitleSchema,
			titleAlt: z.string().optional(),
			description: z.string().optional(),
			parent: reference('regions').optional(),
			links: LinkSchema.array().optional(),
			dateCreated: DateStringSchema.optional(),
			dateUpdated: DateStringSchema.optional(),
			imageSet: ImageSetSchema.array().optional(),
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
		})
		.strict(),
});
