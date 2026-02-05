import { z } from 'zod';

const SingleGeometrySchema = z.object({
	coordinates: z.tuple([z.number(), z.number()]),
});

export const GeometrySchema = z.union([SingleGeometrySchema, z.array(SingleGeometrySchema)]);

// Regions in the data store are resolved references with {id, collection}
export const RegionsSchema = z.object({ id: z.string(), collection: z.literal('regions') }).array();
