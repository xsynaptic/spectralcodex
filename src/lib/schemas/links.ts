import { z } from 'astro:content';

import { linksMap } from '@/lib/data/links';

const LinkItemSchema = z.object({
	title: z.string(),
	titleAlt: z.string().optional(),
	url: z.string().url(),
});

// Link schema; with URLs and predefined titles for commonly referenced sites
export const LinkSchema = LinkItemSchema.or(
	z
		.string()
		.url()
		.transform((value) => {
			const url = new URL(value).href;

			for (const linksMapItem of linksMap) {
				if (url.includes(linksMapItem.match)) {
					return {
						title: linksMapItem.title,
						...('titleAlt' in linksMapItem ? { titleAlt: linksMapItem.titleAlt } : {}),
						url: value,
					};
				}
			}
			throw new Error(`Error: there was no match for this link: "${value}"`);
		}),
);
