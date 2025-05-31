import { z } from 'zod';

export const GeometryTypeEnum = {
	Point: 'Point',
	MultiPoint: 'MultiPoint',
	LineString: 'LineString',
} as const;

const GeometryPointSchema = z.object({
	type: z.literal(GeometryTypeEnum.Point),
	coordinates: z.tuple([z.number(), z.number()]),
});

const GeometryLineStringSchema = z.object({
	type: z.literal(GeometryTypeEnum.LineString),
	coordinates: z.tuple([z.number(), z.number()]).array().nonempty().min(2),
});

export const GeometrySchema = z.discriminatedUnion('type', [
	GeometryPointSchema,
	GeometryLineStringSchema,
]);
