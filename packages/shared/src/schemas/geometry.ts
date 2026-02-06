import { z } from 'zod';

const SingleGeometrySchema = z.object({
	coordinates: z.tuple([z.number(), z.number()]),
});

export const GeometrySchema = z.union([SingleGeometrySchema, z.array(SingleGeometrySchema)]);
