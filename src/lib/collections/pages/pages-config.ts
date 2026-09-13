import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { DateSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { LinkSchema } from '#lib/schemas/resources.ts';

// Note: pages do not have a flat structure; the URL will reflect the location on the file system
export const pages = defineCollection({
	loader: createEntryGlobLoader('pages'),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			links: LinkSchema.array().optional(),
			dateCreated: DateSchema,
			dateUpdated: DateSchema.optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			hideSearch: z.boolean().optional(),
		})
		.strict(),
});
