import { glob } from 'astro/loaders';
import { defineCollection, reference, z } from 'astro:content';
import { CONTENT_PATH } from 'astro:env/server';

import {
	DateStringSchema,
	DescriptionSchema,
	NumericScaleSchema,
	TitleSchema,
} from '@/lib/schemas/content';
import { LinkSchema } from '@/lib/schemas/links';

// Note: pages do not have a flat structure; the URL will reflect the location on the file system
export const pages = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_PATH}/pages` }),
	schema: z
		.object({
			title: TitleSchema,
			titleAlt: z.string().optional(),
			description: DescriptionSchema,
			themes: reference('themes').array().optional(),
			links: LinkSchema.array().optional(),
			dateCreated: DateStringSchema,
			dateUpdated: DateStringSchema.optional(),
			imageFeatured: reference('images').optional(),
			imageHero: reference('images').optional(),
			entryQuality: NumericScaleSchema,
		})
		.strict(),
});
