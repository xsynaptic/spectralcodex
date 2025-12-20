import { CONTENT_DATA_PATH } from 'astro:env/server';
import path from 'node:path';
import pMemoize from 'p-memoize';
import { z } from 'zod';

import {
	nameMultilingualSchema,
	publisherMultilingualSchema,
	titleMultilingualSchema,
} from '#lib/i18n/i18n-schemas.ts';
import { LinkSchema } from '#lib/schemas/links.ts';
import { loadYamlData } from '#lib/utils/data.ts';

const SourceAuthorSchema = z.object({
	name: z.string(),
	...nameMultilingualSchema,
});

const SourceItemSchema = z.object({
	title: z.string(),
	...titleMultilingualSchema,
	description: z.string().optional(),
	authors: SourceAuthorSchema.array().optional(),
	publisher: z.string().optional(),
	...publisherMultilingualSchema,
	datePublished: z.string().optional(),
	links: LinkSchema.array().optional(),
});

type SourceData = z.infer<typeof SourceItemSchema>;

/**
 * Load and cache sources data from YAML file
 */
const getSourcesMap = pMemoize(async (): Promise<Record<string, SourceData>> => {
	try {
		const data = await loadYamlData(path.join(CONTENT_DATA_PATH, 'sources.yaml'));

		return await z.record(z.string(), SourceItemSchema).parseAsync(data);
	} catch (error) {
		console.error('Failed to load sources data:', error);

		return {};
	}
});

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
