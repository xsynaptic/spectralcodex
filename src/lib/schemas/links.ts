import { z } from 'astro:content';

import { linksMap } from '#lib/data/links.ts';
import { titleMultilingualSchema } from '#lib/schemas/i18n.ts';

const LinkItemSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	url: z.string().url(),
});

// Link schema; with URLs and predefined titles for commonly referenced sites
export const LinkSchema = LinkItemSchema.or(
	z
		.string()
		.url()
		.transform((value) => {
			const url = new URL(value).href;

			for (const { match, ...linksMapItem } of linksMap) {
				if (url.includes(match)) {
					return {
						...linksMapItem,
						url: value,
					};
				}
			}
			throw new Error(`Error: there was no match for this link: "${value}"`);
		}),
);
