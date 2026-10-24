import { getCachePaths } from '@spectralcodex/shared/paths';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { z } from 'zod';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { isListed } from '#lib/utils/content-policy.ts';

async function loadDataFile(filePath: string) {
	const resolvedFilePath = path.join(process.cwd(), filePath);

	return readFile(resolvedFilePath, 'utf8');
}

async function loadJsonData(filePath: string) {
	const fileContent = await loadDataFile(filePath);

	return JSON.parse(fileContent) as unknown;
}

const SimilarContentItemSchema = z
	.record(
		z.string(),
		z
			.object({
				collection: z.string(),
				id: z.string(),
				score: z.number(), // Float
			})
			.array(),
	)
	.optional();

async function createSimilarContentFunction() {
	const similarContentData = await loadSimilarContentData();

	const catalog = await getCatalog();

	return function getSimilarContent({
		hasImageFeatured = true,
		id,
		limit = 10,
		threshold = 0.5,
	}: {
		hasImageFeatured?: boolean;
		id: string;
		limit?: number | undefined;
		threshold?: number;
	}): Array<CatalogItem> {
		if (!similarContentData) return [];

		const similarItem = similarContentData[id];

		if (!similarItem) return [];

		return similarItem
			.filter((item) => item.score >= threshold)
			.map((item) => catalog.getById(item.id))
			.filter((item) => item !== undefined)
			.filter(isListed)
			.filter((item) => (hasImageFeatured ? !!item.imageId : !item.imageId))
			.slice(0, limit);
	};
}

async function loadSimilarContentData() {
	const filePath = getCachePaths(CUSTOM_CACHE_PATH).similarContentPath;

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

let similarContentFunction: ReturnType<typeof createSimilarContentFunction> | undefined;

export async function getSimilarContentFunction() {
	if (!similarContentFunction) {
		similarContentFunction = createSimilarContentFunction();
	}
	return similarContentFunction;
}
