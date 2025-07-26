import { glob } from 'astro/loaders';
import { defineCollection, reference, z } from 'astro:content';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import {
	DateStringSchema,
	DescriptionSchema,
	NumericScaleSchema,
	TitleSchema,
} from '#lib/schemas/content.ts';
import { LinkSchema } from '#lib/schemas/links.ts';

// Note: pages do not have a flat structure; the URL will reflect the location on the file system
export const pages = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/pages` }),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			description: DescriptionSchema,
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			links: LinkSchema.array().optional(),
			dateCreated: DateStringSchema,
			dateUpdated: DateStringSchema.optional(),
			imageFeatured: z.string().optional(),
			imageHero: z.string().optional(),
			entryQuality: NumericScaleSchema,
			hideSearch: z.boolean().optional(),
		})
		.strict(),
});
