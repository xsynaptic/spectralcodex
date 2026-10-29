import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { withSitemapLastmod } from '#lib/collections/collections-lastmod.ts';
import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { entrySchemaFields } from '#lib/collections/collections-schemas.ts';
import { ResourceSchema } from '#lib/schemas/resources.ts';

export const resources = defineCollection({
	loader: withSitemapLastmod('resources', createEntryGlobLoader('resources')),
	schema: ResourceSchema.extend({
		...entrySchemaFields,
		match: z.union([z.string(), z.array(z.string())]).optional(),
		regions: reference('regions').array().optional(),
		showPage: z.boolean().optional(),
		subtitle: z.string().optional(), // TODO: note that this is currently unused
		themes: reference('themes').array().optional(),
	}).strict(),
});
