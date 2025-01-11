import { defineCollection, z } from 'astro:content';

import { DateStringSchema, TitleSchema } from '@/lib/schemas/content';
import { getLocalImageTransformFunction } from '@/lib/schemas/image';
import { LinkSchema } from '@/lib/schemas/links';

// Note: this is currently unused
export const authors = defineCollection({
	schema: ({ image }) =>
		z
			.object({
				title: TitleSchema,
				titleAlt: z.string().optional(),
				description: z.string().optional(),
				dateCreated: DateStringSchema,
				dateUpdated: DateStringSchema.optional(),
				imageFeatured: getLocalImageTransformFunction({ image }).optional(),
				links: LinkSchema.array().optional(),
			})
			.strict(),
});
