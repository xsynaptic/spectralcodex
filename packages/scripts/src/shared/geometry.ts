import { z } from 'zod';

// A lax reader for location frontmatter geometry; the app owns the authoring schema
const LocationPointSchema = z.object({
	coordinates: z.tuple([z.number(), z.number()]),
});

export const LocationGeometrySchema = z.union([LocationPointSchema, z.array(LocationPointSchema)]);
