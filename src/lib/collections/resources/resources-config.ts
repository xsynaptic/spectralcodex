import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { DateSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { ResourceSchema } from '#lib/schemas/resources.ts';

export const resources = defineCollection({
	loader: createEntryGlobLoader('resources'),
	schema: ResourceSchema.extend({
		_entryCount: z.number().optional(),
		_locationCount: z.number().optional(),
		_postCount: z.number().optional(),
		dateCreated: DateSchema,
		dateUpdated: DateSchema.optional(),
		entryQuality: NumericScaleSchema,
		formerIds: z.string().array().optional(),
		imageFeatured: ImageFeaturedSchema.optional(),
		match: z.union([z.string(), z.array(z.string())]).optional(),
		regions: reference('regions').array().optional(),
		showPage: z.boolean().optional(),
		subtitle: z.string().optional(), // TODO: note that this is currently unused
		themes: reference('themes').array().optional(),
		title: TitleSchema,
	}).strict(),
});
