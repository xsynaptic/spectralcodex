import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { entrySchemaFields } from '#lib/collections/collections-schemas.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

export const themes = defineCollection({
	loader: createEntryGlobLoader('themes'),
	schema: z
		.object({
			...entrySchemaFields,
			hideMap: z.boolean().optional(),
			// fallow-ignore-next-line code-duplication -- Same alphabetical reference tail as posts; the field sets differ
			links: LinkSchema.array().optional(),
			regions: reference('regions').array().optional(),
			sources: SourceSchema.array().optional(),
			themes: reference('themes').array().optional(),
		})
		.strict(),
});
