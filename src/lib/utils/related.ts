import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

/**
 * A general file loading function that resolves the file path relative to the project root
 */
async function loadDataFile(filePath: string) {
	const resolvedFilePath = path.join(process.cwd(), filePath);

	return readFile(resolvedFilePath, 'utf8');
}

/**
 * Load JSON data from the configured content data path
 */
async function loadJsonData(filePath: string) {
	const fileContent = await loadDataFile(filePath);

	return JSON.parse(fileContent) as unknown;
}

/**
 * Schema for related content data
 */
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
	const filePath = path.join(CUSTOM_CACHE_PATH, 'content-related/content-related.json');

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

async function createRelatedContentFunction() {
	const relatedContentData = await loadRelatedContentData();

	const contentMetadataIndex = await getContentMetadataIndex();

	return function getRelatedContent({
		id,
		limit = 10,
		threshold = 0.6,
		hasImageFeatured = true,
	}: {
		id: string;
		limit?: number | undefined;
		threshold?: number;
		hasImageFeatured?: boolean;
	}): Array<ContentMetadataItem> {
		if (!relatedContentData) return [];

		const relatedItem = relatedContentData[id];

		if (!relatedItem) return [];

		return relatedItem
			.filter((item) => item.score >= threshold)
			.map((item) => contentMetadataIndex.get(item.id))
			.filter((item) => !!item?.imageId === hasImageFeatured)
			.filter((item) => item !== undefined)
			.slice(0, limit);
	};
}

let relatedContentFunction: ReturnType<typeof createRelatedContentFunction> | undefined;

export async function getRelatedContentFunction() {
	if (!relatedContentFunction) {
		relatedContentFunction = createRelatedContentFunction();
	}
	return relatedContentFunction;
}
