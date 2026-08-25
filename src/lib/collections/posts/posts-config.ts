import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { contentCollectionsPath } from '#constants.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import {
	DateRecordedSchema,
	DateSchema,
	NumericScaleSchema,
	TitleSchema,
} from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const posts = defineCollection({
	loader: glob({
		pattern: '**/[^_]*.(md|mdx)',
		base: `${contentCollectionsPath}/posts`,
		generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.(md|mdx)$/, ''),
	}),
	schema: z
		.object({
			title: TitleSchema,
			...titleMultilingualSchema,
			description: z.string().optional(),
			locations: reference('locations').array().optional(),
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
			links: LinkSchema.array().optional(),
			sources: SourceSchema.array().optional(),
			dateCreated: DateSchema,
			dateUpdated: DateSchema.optional(),
			dateRecorded: DateRecordedSchema.optional(),
			imageFeatured: ImageFeaturedSchema.optional(),
			hideSearch: z.boolean().optional(),
			entryQuality: NumericScaleSchema,
			formerIds: z.string().array().optional(),
		})
		.strict(),
});
