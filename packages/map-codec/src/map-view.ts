import { z } from 'zod';

import { MapPositionSchema } from '#codec.ts';
import { MapFeaturesRuleSchema } from '#map-rules.ts';

const MapScopeSchema = z.object({
	apiDivisionUrl: z.string().exactOptional(),
	bounds: z
		.union([
			z.tuple([z.number(), z.number(), z.number(), z.number()]),
			z.tuple([MapPositionSchema, MapPositionSchema]),
		])
		.exactOptional(),
	rule: MapFeaturesRuleSchema,
	title: z.string(),
	url: z.string(),
});

export const MapViewSchema = z.object({
	scope: MapScopeSchema.exactOptional(),
	targetIds: z.array(z.string()).exactOptional(),
});

export type MapScope = z.output<typeof MapScopeSchema>;

export type MapView = z.output<typeof MapViewSchema>;
