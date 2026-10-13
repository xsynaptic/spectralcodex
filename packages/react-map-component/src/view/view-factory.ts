import { z } from 'zod';

import type { MapView } from '#types.ts';

const PositionSchema = z.tuple([z.number(), z.number()]);

const MapScopeSchema = z.object({
	apiDivisionUrl: z.string().exactOptional(),
	bounds: z
		.union([
			z.tuple([z.number(), z.number(), z.number(), z.number()]),
			z.tuple([PositionSchema, PositionSchema]),
		])
		.exactOptional(),
	rule: z.discriminatedUnion('type', [
		z.object({ ids: z.array(z.string()), type: z.literal('ids') }),
		z.object({ index: z.number(), type: z.literal('theme') }),
		z.object({ interval: z.tuple([z.number(), z.number()]), type: z.literal('region') }),
	]),
	title: z.string(),
	url: z.string(),
});

const MapViewSchema = z.object({
	scope: MapScopeSchema.exactOptional(),
	targetIds: z.array(z.string()).exactOptional(),
}) satisfies z.ZodType<MapView>;

// A page that sets no view, or a malformed one, leaves the map as it is
export function parseMapView(value: string | undefined, isDev = false): MapView {
	if (!value) return {};

	try {
		return MapViewSchema.parse(JSON.parse(value));
	} catch (error) {
		if (isDev) console.warn('[Map] Malformed host view:', error);

		return {};
	}
}
