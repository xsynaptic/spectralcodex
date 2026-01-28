import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import {
	DateStringSchema,
	NumericScaleSchema,
	StylizedTextSchema,
	ImageFeaturedSchema,
} from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const themes = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/themes` }),
	schema: z
		.object({
			title: StylizedTextSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			links: LinkSchema.array().optional(),
			sources: SourceSchema.array().optional(),
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			dateCreated: DateStringSchema,
			dateUpdated: DateStringSchema.optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			hideSearch: z.boolean().optional(),
			entryQuality: NumericScaleSchema,
			/** Computed properties, for internal use only! */
			_locationCount: z.number().int().optional(),
			_postCount: z.number().int().optional(),
		})
		.strict(),
});
