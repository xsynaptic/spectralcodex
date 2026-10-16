import { z } from 'zod';

export const MapScopeRowSchema = z.object({
	count: z.number().int(),
	id: z.string(),
	kind: z.enum(['region', 'series', 'theme']),
	ordinal: z.number().int().exactOptional(),
	parentTitle: z.string().exactOptional(),
	title: z.string(),
	titleMultilingual: z.string().exactOptional(),
	url: z.string(),
});

export type MapScopeRow = z.output<typeof MapScopeRowSchema>;
