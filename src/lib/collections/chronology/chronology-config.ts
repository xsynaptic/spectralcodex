import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'zod';

import { contentCollectionsPath } from '#constants.ts';

const chronologySchema = z
	.object({
		imageFeatured: ImageFeaturedSchema.optional(),
	})
	.strict();

export const chronology = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${contentCollectionsPath}/chronology` }),
	schema: chronologySchema,
});
