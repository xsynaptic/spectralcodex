import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { defineCollection } from 'astro:content';
import { z } from 'zod';

import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';

const chronologySchema = z
	.object({
		imageFeatured: ImageFeaturedSchema.optional(),
	})
	.strict();

export const chronology = defineCollection({
	loader: createEntryGlobLoader('chronology'),
	schema: chronologySchema,
});
