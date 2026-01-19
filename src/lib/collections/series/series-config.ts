import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { ImageFeaturedSchema } from '#lib/image/image-featured.ts';
import { DateStringSchema, NumericScaleSchema, StylizedTextSchema } from '#lib/schemas/index.ts';

export const series = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/series` }),
	schema: z
		.object({
			title: StylizedTextSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			// Strings, not references, because we mix content here (posts and locations)
			seriesItems: z.string().array().optional(),
			dateCreated: DateStringSchema,
			dateUpdated: DateStringSchema.optional(),
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			entryQuality: NumericScaleSchema,
			/** Derived properties, for internal use only! */
			locationCount: z.number().int().optional(),
			postCount: z.number().int().optional(),
			hideSearch: z.boolean().optional(),
		})
		.strict(),
});
