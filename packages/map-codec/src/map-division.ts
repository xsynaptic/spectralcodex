import { z } from 'zod';

const PolygonCoordinatesSchema = z.tuple([z.number(), z.number()]).array().array();

export const MapDivisionMaskSchema = z.discriminatedUnion('type', [
	z.object({ coordinates: PolygonCoordinatesSchema, type: z.literal('Polygon') }),
	z.object({ coordinates: PolygonCoordinatesSchema.array(), type: z.literal('MultiPolygon') }),
]);

export type MapDivisionMask = z.output<typeof MapDivisionMaskSchema>;
