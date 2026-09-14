import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import {
	DateRecordedSchema,
	DateSchema,
	NumericScaleSchema,
	TitleSchema,
} from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const posts = defineCollection({
	loader: createEntryGlobLoader('posts', { flatIds: true }),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			dateCreated: DateSchema,
			dateRecorded: DateRecordedSchema.optional(),
			dateUpdated: DateSchema.optional(),
			description: z.string().optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			hideSearch: z.boolean().optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			links: LinkSchema.array().optional(),
			locations: reference('locations').array().optional(),
			regions: reference('regions').array().optional(),
			sources: SourceSchema.array().optional(),
			themes: reference('themes').array().optional(),
		})
		.strict(),
});
