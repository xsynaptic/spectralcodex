import { z } from 'zod';

/**
 * Featured images
 */
const ImageFeaturedObjectSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	link: z.string().optional(),
	hero: z.boolean().optional(),
});

export type ImageFeaturedObject = z.infer<typeof ImageFeaturedObjectSchema>;

export const ImageFeaturedSchema = z.union([
	z.string(),
	ImageFeaturedObjectSchema,
	z.union([z.string(), ImageFeaturedObjectSchema]).array(),
]);

export type ImageFeatured = z.infer<typeof ImageFeaturedSchema>;
