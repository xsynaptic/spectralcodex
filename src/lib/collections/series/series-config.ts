import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { entrySchemaFields } from '#lib/collections/collections-schemas.ts';
import { DateRecordedSchema } from '#lib/schemas/index.ts';

export const series = defineCollection({
	loader: createEntryGlobLoader('series'),
	schema: z
		.object({
			...entrySchemaFields,
			dateRecorded: DateRecordedSchema.optional(),
			regions: reference('regions').array().optional(),
			// Strings, not references, because we mix content here (posts and locations)
			seriesItems: z.string().array().optional(),
			themes: reference('themes').array().optional(),
		})
		.strict(),
});
