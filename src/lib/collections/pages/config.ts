import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { ImageFeaturedSchema } from '#lib/image/image-featured.ts';
import {
	DateStringSchema,
	DescriptionSchema,
	NumericScaleSchema,
	StylizedStringSchema,
} from '#lib/schemas/index.ts';
import { LinkSchema } from '#lib/schemas/links.ts';

// Note: pages do not have a flat structure; the URL will reflect the location on the file system
export const pages = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/pages` }),
	schema: z
		.object({
			title: StylizedStringSchema,
			...titleMultilingualSchema,
			description: DescriptionSchema,
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			links: LinkSchema.array().optional(),
			dateCreated: DateStringSchema,
			dateUpdated: DateStringSchema.optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			showHero: z.boolean().optional(),
			entryQuality: NumericScaleSchema,
			hideSearch: z.boolean().optional(),
		})
		.strict(),
});
