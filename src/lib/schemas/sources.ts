import { z } from 'astro:content';

import { titleMultilingualSchema } from '#lib/i18n/i18n-schemas.ts';
import { LinkSchema } from '#lib/schemas/links.ts';
import { loadYamlData } from '#lib/utils/yaml.ts';

const SourceItemSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	description: z.string().optional(),
	authors: z.string().array().optional(),
	publisher: z.string().optional(),
	datePublished: z.string().optional(),
	links: LinkSchema.array().optional(),
});

// Cache for loaded sources data
let sourcesMapCache: Record<string, z.infer<typeof SourceItemSchema>> | undefined;

async function getSourcesMap() {
	if (!sourcesMapCache) {
		try {
			const data = await loadYamlData('sources.yaml');

			sourcesMapCache = await z.record(z.string(), SourceItemSchema).parseAsync(data);
		} catch (error) {
			console.error('Failed to load sources data:', error);
			sourcesMapCache = {};
		}
	}
	return sourcesMapCache;
}

// Sources schema; individual or predefined sources both work with this schema
export const SourceSchema = SourceItemSchema.or(
	z.string().transform(async (value) => {
		const sourcesMap = await getSourcesMap();
		if (value in sourcesMap) {
			return sourcesMap[value];
		}
		throw new Error(`Error: there was no match for this source: "${value}"`);
	}),
);
