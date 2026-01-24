import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'zod';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { ImageFeaturedSchema } from '#lib/image/image-featured.ts';

const archivesSchema = z
	.object({
		imageFeatured: ImageFeaturedSchema.optional(),
	})
	.strict();

export const archives = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/archives` }),
	schema: archivesSchema,
});
