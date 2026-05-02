import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { DateStringSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { SourceItemSchema } from '#lib/schemas/resources.ts';

export const resources = defineCollection({
	loader: glob({ pattern: '**/*.mdx', base: `${CONTENT_COLLECTIONS_PATH}/resources` }),
	schema: SourceItemSchema.extend({
		title: TitleSchema,
		subtitle: z.string().optional(), // TODO: note that this is currently unused
		match: z.union([z.string(), z.array(z.string())]).optional(),
		regions: reference('regions').array().optional(),
		themes: reference('themes').array().optional(),
		dateCreated: DateStringSchema.optional(),
		dateUpdated: DateStringSchema.optional(),
		imageFeatured: ImageFeaturedSchema.optional(),
		showPage: z.boolean().optional(),
		entryQuality: NumericScaleSchema,
		formerIds: z.string().array().optional(),
		/** Computed properties, for internal use only! */
		_locationCount: z.number().optional(),
		_postCount: z.number().optional(),
	}).strict(),
});
