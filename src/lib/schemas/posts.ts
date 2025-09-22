import { reference } from 'astro:content';
import { z } from 'zod';

import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { DateStringSchema, NumericScaleSchema, TitleSchema } from '#lib/schemas/index.ts';
import { LinkSchema } from '#lib/schemas/links.ts';
import { SourceSchema } from '#lib/schemas/sources.ts';

// Used by ephemera and posts
export const postSchema = z
	.object({
		slug: z.string(),
		title: TitleSchema,
		...titleMultilingualSchema,
		description: z.string().optional(),
		locations: reference('locations').array().optional(),
		regions: reference('regions').array().optional(),
		themes: reference('themes').array().optional(),
		links: LinkSchema.array().optional(),
		sources: SourceSchema.array().optional(),
		dateCreated: DateStringSchema,
		dateUpdated: DateStringSchema.optional(),
		imageFeatured: z.string().optional(),
		imageHero: z.string().optional(),
		hideSearch: z.boolean().optional(),
		entryQuality: NumericScaleSchema,
	})
	.strict();
