import { z } from 'zod';

import { MapIntervalSchema } from '#map-rules.ts';

export const MapScopeRowSchema = z.object({
	count: z.number().int(),
	id: z.string(),
	interval: MapIntervalSchema.exactOptional(),
	kind: z.enum(['region', 'series', 'theme']),
	parentTitle: z.string().exactOptional(),
	title: z.string(),
	titleMultilingual: z.string().exactOptional(),
	url: z.string(),
});

export type MapScopeRow = z.output<typeof MapScopeRowSchema>;
