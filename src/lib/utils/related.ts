import { CACHE_DIR } from 'astro:env/server';
import path from 'node:path';
import { z } from 'zod';

import type { ContentMetadataItem } from '#lib/types/index.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import { loadJsonData } from '#lib/utils/data.ts';

const RelatedContentItemSchema = z
	.record(
		z.string(),
		z
			.object({
				id: z.string(),
				collection: z.string(),
				score: z.number(), // Float
			})
			.array(),
	)
	.optional();

async function loadRelatedContentData() {
	const filePath = path.join(CACHE_DIR, 'content-related/content-related.json');

	try {
		const relatedContent = await loadJsonData(filePath);
		const relatedContentParsed = await RelatedContentItemSchema.parseAsync(relatedContent);

		return relatedContentParsed;
	} catch (error) {
		const isNotFound = error instanceof Error && 'code' in error && error.code === 'ENOENT';

		if (isNotFound) {
			console.warn(`[Related] Not found: ${filePath} (run pnpm content-related to generate)`);
			return;
		}

		throw error;
	}
}

export async function getRelatedContentFunction() {
	const relatedContentData = await loadRelatedContentData();

	const contentMetadataIndex = await getContentMetadataIndex();

	return function getRelatedContent({
		id,
		limit = 10,
		threshold = 0.6,
	}: {
		id: string;
		limit?: number | undefined;
		threshold: number;
	}): Array<ContentMetadataItem> {
		if (!relatedContentData) return [];

		const relatedItem = relatedContentData[id];

		if (!relatedItem) return [];

		return relatedItem
			.filter((item) => item.score >= threshold)
			.map((item) => contentMetadataIndex.get(item.id))
			.filter((item) => item !== undefined)
			.slice(0, limit);
	};
}
