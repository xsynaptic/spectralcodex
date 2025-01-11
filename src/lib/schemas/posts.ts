import { reference, z } from 'astro:content';

import { DateStringSchema, NumericScaleSchema, TitleSchema } from '@/lib/schemas/content';
import { LinkSchema } from '@/lib/schemas/links';
import { SourceSchema } from '@/lib/schemas/sources';

// Used by ephemera and posts
export const postSchema = z
	.object({
		slug: z.string(),
		title: TitleSchema,
		titleAlt: z.string().optional(),
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
		entryQuality: NumericScaleSchema,
	})
	.strict();
