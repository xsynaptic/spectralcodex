import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { withSitemapLastmod } from '#lib/collections/collections-lastmod.ts';
import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { entrySchemaFields } from '#lib/collections/collections-schemas.ts';
import { DateRecordedSchema } from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const posts = defineCollection({
	loader: withSitemapLastmod('posts', createEntryGlobLoader('posts', { flatIds: true })),
	schema: z
		.object({
			...entrySchemaFields,
			dateRecorded: DateRecordedSchema.optional(),
			links: LinkSchema.array().optional(),
			locations: reference('locations').array().optional(),
			regions: reference('regions').array().optional(),
			sources: SourceSchema.array().optional(),
			themes: reference('themes').array().optional(),
		})
		.strict(),
});
