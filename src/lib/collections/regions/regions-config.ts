import { GeometryBoundingBoxSchema, GeometryDivisionIdSchema } from '@spectralcodex/shared/schemas';
import { defineCollection } from 'astro:content';
import { z } from 'zod';

import { withSitemapLastmod } from '#lib/collections/collections-lastmod.ts';
import { createEntryGlobLoader } from '#lib/collections/collections-loader.ts';
import { entrySchemaFields } from '#lib/collections/collections-schemas.ts';
import { LinkSchema } from '#lib/schemas/resources.ts';

export const regions = defineCollection({
	loader: withSitemapLastmod('regions', createEntryGlobLoader('regions', { flatIds: true })),
	schema: z
		.object({
			...entrySchemaFields,
			divisionClippingBBox: GeometryBoundingBoxSchema.optional(),
			divisionId: GeometryDivisionIdSchema,
			divisionSelectionBBox: GeometryBoundingBoxSchema.optional(),
			hideDivision: z.boolean().optional(),
			links: LinkSchema.array().optional(),
			parent: z.string().optional(),
		})
		.strict(),
});
