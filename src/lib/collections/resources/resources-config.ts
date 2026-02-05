import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import {
	nameMultilingualSchema,
	publisherMultilingualSchema,
	titleMultilingualSchema,
} from '#lib/i18n/i18n-schemas.ts';
import {
	DateStringSchema,
	NumericScaleSchema,
	StylizedTextSchema,
	UrlSchema,
} from '#lib/schemas/index.ts';
import { LinkSchema } from '#lib/schemas/resources.ts';

export const resources = defineCollection({
	loader: glob({ pattern: '**/*.mdx', base: `${CONTENT_COLLECTIONS_PATH}/resources` }),
	schema: z
		.object({
			title: StylizedTextSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			// Website-specific fields (optional)
			url: UrlSchema.optional(),
			match: z.union([z.string(), z.array(z.string())]).optional(),
			// Publication-specific fields (optional)
			authors: z
				.object({
					name: z.string(),
					...nameMultilingualSchema,
				})
				.array()
				.optional(),
			publisher: z.string().optional(),
			...publisherMultilingualSchema,
			datePublished: z.string().optional(),
			links: LinkSchema.array().optional(),
			// Common fields
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			dateCreated: DateStringSchema.optional(),
			dateUpdated: DateStringSchema.optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			showPage: z.boolean().optional(),
			entryQuality: NumericScaleSchema,
			/** Computed properties, for internal use only! */
			_locationCount: z.number().optional(),
			_postCount: z.number().optional(),
		})
		.strict(),
});
