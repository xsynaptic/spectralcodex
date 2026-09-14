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

export const series = defineCollection({
	loader: createEntryGlobLoader('series'),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			_entryCount: z.number().int().optional(),
			_locationCount: z.number().int().optional(),
			_postCount: z.number().int().optional(),
			dateCreated: DateSchema,
			dateRecorded: DateRecordedSchema.optional(),
			dateUpdated: DateSchema.optional(),
			description: z.string().optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			hideSearch: z.boolean().optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			regions: reference('regions').array().optional(),
			// Strings, not references, because we mix content here (posts and locations)
			seriesItems: z.string().array().optional(),
			themes: reference('themes').array().optional(),
		})
		.strict(),
});
