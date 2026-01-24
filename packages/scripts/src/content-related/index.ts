#!/usr/bin/env tsx
import { pipeline } from '@huggingface/transformers';
import { sanitizeMdx } from '@xsynaptic/unified-tools';
import chalk from 'chalk';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { DataStoreEntry } from '../content-utils/data-store.js';

import { getCollection, loadDataStore } from '../content-utils/data-store.js';

/**
 * Arguments
 */
const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'data-store-path': {
			type: 'string',
			short: 'd',
			default: '.astro/data-store.json',
		},
		'cache-path': {
			type: 'string',
			short: 'c',
			default: './node_modules/.astro',
		},
		'cache-name': {
			type: 'string',
			default: 'content-related-cache',
		},
		'character-limit': {
			type: 'string',
			short: 'l',
			default: '2000',
		},
		'result-count': {
			type: 'string',
			short: 'n',
			default: '10',
		},
		'clear-cache': {
			type: 'boolean',
			default: false,
		},
	},
});

/**
 * Types
 */
interface ContentEntry extends DataStoreEntry {
	collection: string;
}

interface ContentRelatedMetadata {
	themes: Array<string>;
	regions: Array<string>;
}

interface ContentRelatedEmbedding {
	id: string;
	digest: string;
	collection: string;
	vector: Array<number>;
	metadata: ContentRelatedMetadata;
}

type ContentRelatedEmbeddingCache = Record<string, ContentRelatedEmbedding>;

interface ContentRelatedItem {
	id: string;
	collection: string;
	score: number;
}

type ContentRelatedResult = Record<string, Array<ContentRelatedItem>>;

/**
 * Models
 */
// Some recommended models to experiment with; more complex models are more accurate but slower
const ModelIdEnum = {
	MiniLm: 'Xenova/all-MiniLM-L6-v2', // 384 dimensional
	MpNet: 'Xenova/all-mpnet-base-v2', // 768 dimensional
	Bge: 'Xenova/bge-m3', // 1024 dimensional, multilingual
} as const;

// Note: changing models will regenerate all embeddings (cache is model-specific)
const MODEL_ID = ModelIdEnum.MiniLm;

/**
 * Clean content for embedding using unified tools
 */
function cleanContent(body: string, data: Record<string, unknown>): string {
	const title = typeof data.title === 'string' ? data.title : '';
	const description = typeof data.description === 'string' ? data.description : '';
	const content = sanitizeMdx(body);

	// Combine title, description, and content; the model will consume it as-is
	return `${title} ${description} ${content}`.slice(0, Number(values['character-limit']));
}

/**
 * Cosine similarity function
 * Note: embeddings are already normalized
 */
function cosineSimilarity(vectorA: Array<number>, vectorB: Array<number>): number {
	if (vectorA.length !== vectorB.length) {
		throw new Error('Vectors must have the same dimensions');
	}

	return vectorA.reduce((sum, next, index) => sum + next * vectorB[index]!, 0);
}

/**
 * Extract only the metadata fields needed for relatedness calculation
 */
function toStringArray(value: unknown): Array<string> {
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === 'string') return [value];
	return [];
}

/**
 * Calculate metadata boost based on shared regions and themes
 */
function calculateMetadataBoost(
	current: ContentRelatedEmbedding,
	other: ContentRelatedEmbedding,
): number {
	let boost = 0;

	// Theme alignment boost
	const currentThemes = new Set(current.metadata.themes);
	const otherThemes = new Set(other.metadata.themes);
	const sharedThemes = [...currentThemes].filter((theme) => otherThemes.has(theme));
	boost += sharedThemes.length * 0.15; // % boost per shared theme

	// Region alignment boost
	const currentRegions = new Set(current.metadata.regions);
	const otherRegions = new Set(other.metadata.regions);
	const sharedRegions = [...currentRegions].filter((region) => otherRegions.has(region));
	boost += sharedRegions.length * 0.1; // % boost per shared region

	// Cap the total boost to prevent overwhelming semantic similarity
	return Math.min(boost, 0.3); // Maximum % boost
}

/**
 * Vector caching
 */
function getCacheFileName(cacheName: string, modelId: string): string {
	return `${cacheName}-${modelId.replaceAll('/', '-')}.json`;
}

function loadCache(
	cacheDir: string,
	cacheName: string,
	modelId: string,
): ContentRelatedEmbeddingCache {
	const cacheFileName = getCacheFileName(cacheName, modelId);
	const cachePath = path.join(cacheDir, cacheFileName);

	if (!existsSync(cachePath)) {
		return {};
	}

	try {
		const data = readFileSync(cachePath, 'utf8');
		const cache = JSON.parse(data) as ContentRelatedEmbeddingCache;

		console.log(`📦 Loaded ${String(Object.keys(cache).length)} cached embeddings`);
		return cache;
	} catch (error) {
		console.warn('⚠️  Failed to load embedding cache:', error);
		return {};
	}
}

function saveCache(
	cache: ContentRelatedEmbeddingCache,
	cacheDir: string,
	cacheName: string,
	modelId: string,
): void {
	const cacheFileName = getCacheFileName(cacheName, modelId);
	const cachePath = path.join(cacheDir, cacheFileName);

	try {
		// eslint-disable-next-line unicorn/no-null
		writeFileSync(cachePath, JSON.stringify(cache, null, 2));
		console.log(`💾 Saved ${String(Object.keys(cache).length)} embeddings to cache`);
	} catch (error) {
		console.error('❌ Failed to save embedding cache:', error);
	}
}

/**
 * Generate embeddings for all content entries
 */
async function generateEmbeddings(
	entries: Array<ContentEntry>,
	cacheDir: string,
): Promise<Array<ContentRelatedEmbedding>> {
	const cache = loadCache(cacheDir, values['cache-name'], MODEL_ID);

	const embedder = await pipeline('feature-extraction', MODEL_ID, { dtype: 'fp32' });

	console.log(chalk.green(`✅ Loaded embedding model ${chalk.cyan(MODEL_ID)}`));

	const embeddings: Array<ContentRelatedEmbedding> = [];

	let cacheHits = 0;
	let generated = 0;

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];

		if (!entry?.digest) continue;

		try {
			const cachedEmbedding = cache[entry.id];

			if (cachedEmbedding?.digest === entry.digest) {
				embeddings.push(cachedEmbedding);
				cacheHits++;
			} else {
				const plainTextContent = cleanContent(entry.body ?? '', entry.data);
				const output = await embedder(plainTextContent, { pooling: 'mean', normalize: true });
				const vector = [...output.data] as Array<number>;

				const embedding: ContentRelatedEmbedding = {
					id: entry.id,
					digest: entry.digest,
					collection: entry.collection,
					metadata: {
						themes: toStringArray(entry.data.themes),
						regions: toStringArray(entry.data.regions),
					},
					vector,
				};

				embeddings.push(embedding);

				// Update cache in memory
				cache[entry.id] = embedding;
				generated++;
			}

			if ((i + 1) % 10 === 0) {
				console.log(
					chalk.blue(
						`Processed ${chalk.cyan(String(i + 1))}/${chalk.cyan(String(entries.length))} embeddings (${chalk.gray(String(cacheHits))} cached, ${chalk.yellow(String(generated))} generated)`,
					),
				);
			}
		} catch (error) {
			console.error(chalk.red(`Error processing embedding for ${chalk.cyan(entry.id)}:`), error);
		}
	}

	// Save updated cache
	saveCache(cache, cacheDir, values['cache-name'], MODEL_ID);

	console.log(
		chalk.green(
			`✅ Generated ${chalk.cyan(String(embeddings.length))} embeddings (${chalk.gray(String(cacheHits))} from cache, ${chalk.yellow(String(generated))} newly generated)`,
		),
	);

	return embeddings;
}

/**
 * Calculate similarities and find top matches
 */
function calculateSimilarities(embeddings: Array<ContentRelatedEmbedding>): ContentRelatedResult {
	console.log(chalk.blue('Calculating relatedness...'));

	const result: ContentRelatedResult = {};

	for (let i = 0; i < embeddings.length; i++) {
		const current = embeddings[i];
		const relatedContentItems: Array<ContentRelatedItem> = [];

		for (const [j, content] of embeddings.entries()) {
			if (i === j || !current) continue;

			const semanticScore = cosineSimilarity(current.vector, content.vector);
			const metadataBoost = calculateMetadataBoost(current, content);

			// Combine for hybrid score
			const hybridScore = semanticScore + metadataBoost;

			relatedContentItems.push({
				id: content.id,
				collection: content.collection,
				score: hybridScore,
			});
		}

		// Sort by score and slice top results
		relatedContentItems.sort((a, b) => b.score - a.score);
		if (current) {
			result[current.id] = relatedContentItems.slice(0, Number(values['result-count']));
		}

		if ((i + 1) % 50 === 0) {
			console.log(
				chalk.blue(
					`Calculated cosine similarities for ${chalk.cyan(String(i + 1))}/${chalk.cyan(String(embeddings.length))} items`,
				),
			);
		}
	}

	return result;
}

/**
 * Content handling
 */
function getContentEntries(dataStorePath: string): Array<ContentEntry> {
	const { collections, path: resolvedPath } = loadDataStore(dataStorePath);

	console.log(chalk.gray(`Loaded data store from: ${resolvedPath}`));

	// Get entries from posts and locations collections
	const collectionsToProcess = ['posts', 'locations'] as const;
	const entries: Array<ContentEntry> = [];

	for (const collectionName of collectionsToProcess) {
		const collectionEntries = getCollection(collections, collectionName);

		for (const entry of collectionEntries) {
			// Filter: must have digest
			if (!entry.digest) continue;

			// Filter: must have entry quality and be at least 2
			if (typeof entry.data.entryQuality !== 'number' || entry.data.entryQuality < 2) continue;

			entries.push({
				...entry,
				collection: collectionName,
			});
		}
	}

	if (entries.length === 0) {
		console.error(chalk.red('❌ No content found!'));
		process.exit(1);
	}

	return entries;
}

/**
 * Main function
 */
async function contentRelated() {
	try {
		console.log(chalk.magenta('=== Related Content Generator ==='));

		const dataStorePath = values['data-store-path'];
		const cacheDir = values['cache-path'];

		mkdirSync(cacheDir, { recursive: true });

		if (values['clear-cache']) {
			const cacheFiles = readdirSync(cacheDir).filter((file) =>
				file.startsWith(values['cache-name']),
			);
			for (const file of cacheFiles) {
				rmSync(path.join(cacheDir, file));
			}
			if (cacheFiles.length > 0) {
				console.log(chalk.yellow(`🗑️  Cleared ${String(cacheFiles.length)} cache file(s)`));
				process.exit(0);
			} else {
				console.log(chalk.green('🗑️  No cache files to clear'));
				process.exit(0);
			}
		}

		const entries = getContentEntries(dataStorePath);

		console.log(chalk.gray(`Processing ${String(entries.length)} entries from data store`));

		const embeddings = await generateEmbeddings(entries, cacheDir);

		if (embeddings.length === 0) {
			console.error(chalk.red('❌ No embeddings generated!'));
			process.exit(1);
		}

		const relatedContentItems = calculateSimilarities(embeddings);

		// Output results
		const outputPath = path.join(cacheDir, 'content-related.json');

		// eslint-disable-next-line unicorn/no-null
		writeFileSync(outputPath, JSON.stringify(relatedContentItems, null, 2));

		console.log(
			chalk.green(
				`✅ Related content data for ${chalk.cyan(String(Object.keys(relatedContentItems).length))} items written to ${chalk.cyan(outputPath)}`,
			),
		);
	} catch (error) {
		console.error(chalk.red('❌ Error:'), error);
		process.exit(1);
	}
}

await contentRelated();
