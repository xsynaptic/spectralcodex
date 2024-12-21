import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';

import { CONTENT_COLLECTIONS_PATH } from '@/constants';
import { postSchema } from '@/lib/schemas/posts';

export const posts = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${CONTENT_COLLECTIONS_PATH}/posts` }),
	schema: postSchema,
});
