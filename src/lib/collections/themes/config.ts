import { glob } from 'astro/loaders';
import { defineCollection, reference, z } from 'astro:content';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { DateStringSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/content.ts';
import { ImageSetSchema } from '#lib/schemas/image.ts';
import { LinkSchema } from '#lib/schemas/links.ts';
import { SourceSchema } from '#lib/schemas/sources.ts';

export const themes = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/themes` }),
	schema: z
		.object({
			title: TitleSchema,
			titleAlt: z.string().optional(),
			description: z.string().optional(),
			links: LinkSchema.array().optional(),
			sources: SourceSchema.array().optional(),
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			dateCreated: DateStringSchema.optional(),
			dateUpdated: DateStringSchema.optional(),
			imageSet: ImageSetSchema.array().optional(),
			entryQuality: NumericScaleSchema,
			/** Derived properties, for internal use only! */
			locationCount: z.number().int().optional(),
			postCount: z.number().int().optional(),
			hideSearch: z.boolean().optional(),
		})
		.strict(),
});
