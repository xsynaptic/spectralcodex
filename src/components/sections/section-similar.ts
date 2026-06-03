import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';

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
 * Schema for similar content data
 */
const SimilarContentItemSchema = z
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

async function loadSimilarContentData() {
	const filePath = path.join(CUSTOM_CACHE_PATH, 'similar-content.json');

	try {
		const similarContent = await loadJsonData(filePath);
		const similarContentParsed = await SimilarContentItemSchema.parseAsync(similarContent);

		return similarContentParsed;
	} catch (error) {
		const isNotFound = error instanceof Error && 'code' in error && error.code === 'ENOENT';

		if (isNotFound) {
			console.warn(`[Similar] Not found: ${filePath} (run pnpm similar-content to generate)`);
			return;
		}

		throw error;
	}
}

async function createSimilarContentFunction() {
	const similarContentData = await loadSimilarContentData();

	const catalog = await getCatalog();
	const { entriesMap: locationsMap } = await getLocationsCollection();

	return function getSimilarContent({
		id,
		limit = 10,
		threshold = 0.5,
		hasImageFeatured = true,
	}: {
		id: string;
		limit?: number | undefined;
		threshold?: number;
		hasImageFeatured?: boolean;
	}): Array<CatalogItem> {
		if (!similarContentData) return [];

		const similarItem = similarContentData[id];

		if (!similarItem) return [];

		return similarItem
			.filter((item) => item.score >= threshold)
			.filter((item) => !locationsMap.get(item.id)?.data.hideIndex)
			.map((item) => catalog.getById(item.id))
			.filter((item) => item !== undefined)
			.filter((item) => (hasImageFeatured ? !!item.imageId : !item.imageId))
			.slice(0, limit);
	};
}

let similarContentFunction: ReturnType<typeof createSimilarContentFunction> | undefined;

export async function getSimilarContentFunction() {
	if (!similarContentFunction) {
		similarContentFunction = createSimilarContentFunction();
	}
	return similarContentFunction;
}
