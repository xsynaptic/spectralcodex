import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { withSitemapLastmod } from '#lib/collections/collections-lastmod.ts';
import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { entrySchemaFields } from '#lib/collections/collections-schemas.ts';
import { LinkSchema } from '#lib/schemas/resources.ts';

// Note: pages do not have a flat structure; the URL will reflect the location on the file system
export const pages = defineCollection({
	loader: withSitemapLastmod('pages', createEntryGlobLoader('pages')),
	schema: z
		.object({
			...entrySchemaFields,
			links: LinkSchema.array().optional(),
			regions: reference('regions').array().optional(),
			themes: reference('themes').array().optional(),
		})
		.strict(),
});
