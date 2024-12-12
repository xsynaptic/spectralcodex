import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';
import { CONTENT_PATH } from 'astro:env/server';

import { DateStringSchema, NumericScaleSchema, TitleSchema } from '@/lib/schemas/content';
import { getFeaturedImagesSchema } from '@/lib/schemas/image';
import { LinkSchema } from '@/lib/schemas/links';
import { SourceSchema } from '@/lib/schemas/sources';

export const themes = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_PATH}/themes` }),
	schema: z
		.object({
			title: TitleSchema,
			titleAlt: z.string().optional(),
			description: z.string().optional(),
			links: LinkSchema.array().optional(),
			sources: SourceSchema.array().optional(),
			dateCreated: DateStringSchema.optional(),
			dateUpdated: DateStringSchema.optional(),
			images: getFeaturedImagesSchema().array().optional(),
			entryQuality: NumericScaleSchema,
			/** Derived properties, for internal use only! */
			locationCount: z.number().int().optional(),
			postCount: z.number().int().optional(),
		})
		.strict(),
});
