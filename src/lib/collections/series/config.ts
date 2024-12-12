import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';
import { CONTENT_PATH } from 'astro:env/server';

import { DateStringSchema, NumericScaleSchema, TitleSchema } from '@/lib/schemas/content';
import { getFeaturedImagesSchema } from '@/lib/schemas/image';

export const series = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_PATH}/series` }),
	schema: z
		.object({
			title: TitleSchema,
			titleAlt: z.string().optional(),
			description: z.string().optional(),
			// Strings, not references, because we mix content here (posts and locations)
			seriesItems: z.string().array().optional(),
			dateCreated: DateStringSchema,
			dateUpdated: DateStringSchema.optional(),
			images: getFeaturedImagesSchema().array().optional(),
			entryQuality: NumericScaleSchema,
			/** Derived properties, for internal use only! */
			locationCount: z.number().int().optional(),
			postCount: z.number().int().optional(),
		})
		.strict(),
});
