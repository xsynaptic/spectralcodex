import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

import { CONTENT_COLLECTIONS_PATH } from '#constants.ts';
import { ImageFeaturedSchema } from '#lib/image/image-featured.ts';

const timelineSchema = z
	.object({
		imageFeatured: ImageFeaturedSchema.optional(),
	})
	.strict();

export const timeline = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/timeline` }),
	schema: timelineSchema,
});
