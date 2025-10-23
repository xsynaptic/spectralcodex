import path from 'node:path';
import { z } from 'zod';

import { CONTENT_DATA_PATH } from '#constants.ts';
import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { UrlSchema } from '#lib/schemas/index.ts';
import { loadYamlData } from '#lib/utils/data.ts';

const LinkItemSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	url: UrlSchema,
});

// Since links data is transformed we use a slightly modified schema
const LinkDataSchema = LinkItemSchema.extend({
	match: z.string(),
});

// Cache for loaded links data
let linksMapCache: Array<z.infer<typeof LinkDataSchema>> | undefined;

async function getLinksData() {
	if (!linksMapCache) {
		try {
			const data = await loadYamlData(path.join(CONTENT_DATA_PATH, 'links.yaml'));

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
	UrlSchema.transform(async (value) => {
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
