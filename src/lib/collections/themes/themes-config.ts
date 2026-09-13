import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { DateSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const themes = defineCollection({
	loader: createEntryGlobLoader('themes'),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			links: LinkSchema.array().optional(),
			sources: SourceSchema.array().optional(),
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			dateCreated: DateSchema,
			dateUpdated: DateSchema.optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			hideSearch: z.boolean().optional(),
			hideMap: z.boolean().optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			// Computed properties, for internal use only!
			_locations: z.string().array().optional(),
			_locationCount: z.number().int().optional(),
			_posts: z.string().array().optional(),
			_postCount: z.number().int().optional(),
			_entryCount: z.number().int().optional(),
		})
		.strict(),
});
