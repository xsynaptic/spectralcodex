import { z } from 'zod';

export const GeometryTypeEnum = {
	Point: 'Point',
	MultiPoint: 'MultiPoint',
	LineString: 'LineString',
	Polygon: 'Polygon',
	MultiPolygon: 'MultiPolygon',
} as const;

const GeometryPointSchema = z.object({
	type: z.literal(GeometryTypeEnum.Point),
	coordinates: z.tuple([z.number(), z.number()]),
});

const GeometryMultiPointSchema = z.object({
	type: z.literal(GeometryTypeEnum.MultiPoint),
	coordinates: z.tuple([z.number(), z.number()]).array().nonempty().min(2),
});

const GeometryLineStringSchema = z.object({
	type: z.literal(GeometryTypeEnum.LineString),
	coordinates: z.tuple([z.number(), z.number()]).array().nonempty().min(2),
});

const GeometryPolygonSchema = z.object({
	type: z.literal(GeometryTypeEnum.Polygon),
	coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
});

const GeometryMultiPolygonSchema = z.object({
	type: z.literal(GeometryTypeEnum.MultiPolygon),
	coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])))).min(1),
});

export const GeometrySchema = z.discriminatedUnion('type', [
	GeometryPointSchema,
	GeometryMultiPointSchema,
	GeometryLineStringSchema,
	GeometryPolygonSchema,
	GeometryMultiPolygonSchema,
]);
