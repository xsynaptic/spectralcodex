import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { CONTENT_DATA_PATH } from 'astro:env/server';
import { z } from 'zod';

import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import {
	DateRecordedSchema,
	DateSchema,
	NumericScaleSchema,
	TitleSchema,
} from '#lib/schemas/index.ts';

export const series = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `./${CONTENT_DATA_PATH}/series` }),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			// Strings, not references, because we mix content here (posts and locations)
			seriesItems: z.string().array().optional(),
			dateCreated: DateSchema,
			dateUpdated: DateSchema.optional(),
			dateRecorded: DateRecordedSchema.optional(),
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			hideSearch: z.boolean().optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
			// Computed properties, for internal use only!
			_locationCount: z.number().int().optional(),
			_postCount: z.number().int().optional(),
			_entryCount: z.number().int().optional(),
		})
		.strict(),
});
