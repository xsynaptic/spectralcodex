import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { COLLECTIONS_PATH } from 'astro:env/server';

import { postSchema } from '@/lib/schemas/posts';

export const posts = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${COLLECTIONS_PATH}/posts` }),
	schema: postSchema,
});
