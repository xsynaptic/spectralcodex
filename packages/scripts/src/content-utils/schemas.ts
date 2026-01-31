import { z } from 'zod';

export const ImageFeaturedSchema = z.union([
	z.string(),
	z.object({ id: z.string() }),
	z.array(z.union([z.string(), z.object({ id: z.string() })])),
]);

const SingleGeometrySchema = z.object({
	coordinates: z.tuple([z.number(), z.number()]),
});

export const GeometrySchema = z.union([SingleGeometrySchema, z.array(SingleGeometrySchema)]);

// Regions in the data store are resolved references with {id, collection}
export const RegionsSchema = z.object({ id: z.string(), collection: z.literal('regions') }).array();

export const EntryQualitySchema = z.number().min(0).max(5);
