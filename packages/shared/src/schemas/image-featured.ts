import { z } from 'zod';

const ImageFeaturedObjectSchema = z.object({
	hero: z.boolean().optional(),
	id: z.string(),
	link: z.string().optional(),
	title: z.string().optional(),
});

export type ImageFeaturedObject = z.infer<typeof ImageFeaturedObjectSchema>;

const ImageFeaturedItemSchema = z.union([z.string(), ImageFeaturedObjectSchema]);

export type ImageFeaturedItem = z.infer<typeof ImageFeaturedItemSchema>;

export const ImageFeaturedSchema = z.union([z.string(), ImageFeaturedItemSchema.array()]);

export type ImageFeatured = z.infer<typeof ImageFeaturedSchema>;
