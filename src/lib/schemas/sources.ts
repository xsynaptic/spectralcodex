import { z } from 'astro:content';

import { sourcesMap } from '#lib/data/sources.ts';
import { titleMultilingualSchema } from '#lib/schemas/i18n.ts';
import { LinkSchema } from '#lib/schemas/links.ts';

const SourceItemSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	description: z.string().optional(),
	authors: z.string().array().optional(),
	publisher: z.string().optional(),
	datePublished: z.string().optional(),
	links: LinkSchema.array().optional(),
});

// Sources schema; individual or predefined sources both work with this schema
export const SourceSchema = SourceItemSchema.or(
	z.string().transform((value) => {
		if (value in sourcesMap) {
			return sourcesMap[value as keyof typeof sourcesMap];
		}
		throw new Error(`Error: there was no match for this source: "${value}"`);
	}),
);

export type SourceItemInput = z.input<typeof SourceItemSchema>;
