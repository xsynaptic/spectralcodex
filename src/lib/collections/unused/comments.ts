import { defineCollection, z } from 'astro:content';

import { DateStringSchema } from '@/lib/schemas/content';

// Note: this is currently unused
export const comments = defineCollection({
	type: 'data',
	schema: z.object({
		contentSlug: z.string(),
		contentType: z.string(),
		comments: z
			.object({
				commentId: z.number().int(),
				commentIndex: z.number().int(),
				authorName: z.string().optional(),
				authorEmail: z.string().optional(),
				authorUrl: z.string().optional(),
				authorIp: z.string().optional(),
				dateCreated: DateStringSchema,
				replyTo: z.number().int().optional(),
				comment: z.string(),
			})
			.array(),
	}),
});
