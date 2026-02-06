import { z } from 'zod';

const SingleGeometrySchema = z.object({
	coordinates: z.tuple([z.number(), z.number()]),
});

export const GeometrySchema = z.union([SingleGeometrySchema, z.array(SingleGeometrySchema)]);

// Regions in the data store are resolved references with {id, collection}
export const RegionsSchema = z.object({ id: z.string(), collection: z.literal('regions') }).array();

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
