import { z } from 'zod';

export const GeometryTypeEnum = {
	Point: 'Point',
	MultiPoint: 'MultiPoint',
	LineString: 'LineString',
	Polygon: 'Polygon',
	MultiPolygon: 'MultiPolygon',
} as const;

export const GeometryDivisionIdSchema = z.union([z.string(), z.string().array()]).nullable();

export const GeometryBoundingBoxSchema = z.object({
	lngMin: z.number(),
	lngMax: z.number(),
	latMin: z.number(),
	latMax: z.number(),
});

export type GeometryBoundingBox = z.infer<typeof GeometryBoundingBoxSchema>;
