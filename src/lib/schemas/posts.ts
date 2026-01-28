import { reference } from 'astro:content';
import { z } from 'zod';

import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import {
	DateStringSchema,
	NumericScaleSchema,
	StylizedTextSchema,
	ImageFeaturedSchema,
} from '#lib/schemas/index.ts';
import { LinkSchema, SourceSchema } from '#lib/schemas/resources.ts';

// Used by ephemera and posts
export const postSchema = z
	.object({
		slug: z.string(),
		title: StylizedTextSchema,
		...titleMultilingualSchema,
		description: z.string().optional(),
		locations: reference('locations').array().optional(),
		regions: reference('regions').array().optional(),
		themes: reference('themes').array().optional(),
		links: LinkSchema.array().optional(),
		sources: SourceSchema.array().optional(),
		dateCreated: DateStringSchema,
		dateUpdated: DateStringSchema.optional(),
		imageFeatured: ImageFeaturedSchema.optional(),
		showHero: z.boolean().optional(),
		hideSearch: z.boolean().optional(),
		entryQuality: NumericScaleSchema,
	})
	.strict();
