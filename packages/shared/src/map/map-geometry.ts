import { z } from 'zod';

export const GeometryTypeEnum = {
	LineString: 'LineString',
	MultiPoint: 'MultiPoint',
	MultiPolygon: 'MultiPolygon',
	Point: 'Point',
	Polygon: 'Polygon',
} as const;

export const GeometryDivisionIdSchema = z.union([z.string(), z.string().array()]).nullable();

export const GeometryBoundingBoxSchema = z.object({
	latMax: z.number(),
	latMin: z.number(),
	lngMax: z.number(),
	lngMin: z.number(),
});

export type GeometryBoundingBox = z.infer<typeof GeometryBoundingBoxSchema>;
