import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { DateSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { ResourceSchema } from '#lib/schemas/resources.ts';

export const resources = defineCollection({
	loader: createEntryGlobLoader('resources'),
	schema: ResourceSchema.extend({
		title: TitleSchema,
		subtitle: z.string().optional(), // TODO: note that this is currently unused
		match: z.union([z.string(), z.array(z.string())]).optional(),
		regions: reference('regions').array().optional(),
		themes: reference('themes').array().optional(),
		dateCreated: DateSchema,
		dateUpdated: DateSchema.optional(),
		imageFeatured: ImageFeaturedSchema.optional(),
		showPage: z.boolean().optional(),
		entryQuality: NumericScaleSchema,
		formerIds: z.string().array().optional(),
		// Computed properties, for internal use only!
		_locationCount: z.number().optional(),
		_postCount: z.number().optional(),
		_entryCount: z.number().optional(),
	}).strict(),
});
