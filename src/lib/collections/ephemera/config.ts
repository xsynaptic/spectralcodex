import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { COLLECTIONS_PATH } from 'astro:env/server';

import { postSchema } from '@/lib/schemas/posts';

export const ephemera = defineCollection({
	loader: glob({ pattern: '**/[^_]*.(md|mdx)', base: `${COLLECTIONS_PATH}/ephemera` }),
	schema: postSchema,
});
