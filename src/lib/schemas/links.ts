import { z } from 'astro:content';

import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { loadYamlData } from '#lib/utils/yaml.ts';

const LinkItemSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	url: z.string().url(),
});

// Since links data is transformed we use a slightly modified schema
const LinkDataSchema = LinkItemSchema.omit({ url: true }).extend({
	match: z.string(),
});

// Cache for loaded links data
let linksMapCache: Array<z.infer<typeof LinkDataSchema>> | undefined;

async function getLinksData() {
	if (!linksMapCache) {
		try {
			const data = await loadYamlData('links.yaml');

			linksMapCache = await z.array(LinkDataSchema).parseAsync(data);
		} catch (error) {
			console.error('Failed to load links data:', error);
			linksMapCache = [];
		}
	}
	return linksMapCache;
}

// Link schema; with URLs and predefined titles for commonly referenced sites
export const LinkSchema = LinkItemSchema.or(
	z
		.string()
		.url()
		.transform(async (value) => {
			const url = new URL(value).href;
			const linksData = await getLinksData();

			for (const { match, ...linksDataItem } of linksData) {
				if (url.includes(match)) {
					return {
						...linksDataItem,
						url: value,
					};
				}
			}
			throw new Error(`Error: there was no match for this link: "${value}"`);
		}),
);
