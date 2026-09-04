import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { CONTENT_DATA_PATH } from 'astro:env/server';
import { z } from 'zod';

const chronologySchema = z
	.object({
		imageFeatured: ImageFeaturedSchema.optional(),
	})
	.strict();

export const chronology = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `./${CONTENT_DATA_PATH}/chronology` }),
	schema: chronologySchema,
});
