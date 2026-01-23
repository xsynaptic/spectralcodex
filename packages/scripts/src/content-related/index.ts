#!/usr/bin/env tsx
import { pipeline } from '@huggingface/transformers';
import { sanitizeMdx } from '@xsynaptic/unified-tools';
import chalk from 'chalk';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { ContentFileMetadata } from '../content-utils';

import { parseContentFiles } from '../content-utils';
import { getContentCollectionPaths } from '../content-utils/collections';

/**
 * Arguments
 */
const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			short: 'r',
			default: process.cwd(),
		},
		'content-path': {
			type: 'string',
			short: 'p',
			default: 'packages/content',
		},
		'cache-path': {
			type: 'string',
			short: 'c',
			default: './node_modules/.astro',
		},
		'cache-name': {
			type: 'string',
			short: 'n',
			default: 'content-related-cache',
		},
		'character-limit': {
			type: 'string',
			short: 'l',
			default: '5000',
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
interface ContentRelatedEmbedding {
	id: string;
	hash: string;
	collection: string;
	vector: Array<number>;
	frontmatter: Record<string, unknown>;
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
const MODEL_ID = ModelIdEnum.MpNet;

/**
 * Clean content for embedding using unified tools
 */
function cleanContent(contentRaw: string, frontmatter: Record<string, unknown>): string {
	const title = typeof frontmatter.title === 'string' ? frontmatter.title : '';
	const description = typeof frontmatter.description === 'string' ? frontmatter.description : '';
	const content = sanitizeMdx(contentRaw);

	// Combine title, description, and content; the model will consume it as-is
	return `${title} ${description} ${content}`.slice(0, Number(values['character-limit']));
}

/**
 * Cosine similarity function
 */
function cosineSimilarity(vecA: Array<number>, vecB: Array<number>): number {
	if (vecA.length !== vecB.length) {
		throw new Error('Vectors must have the same dimensions');
	}

	const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i]!, 0);
	const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
	const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

	if (magnitudeA === 0 || magnitudeB === 0) return 0;

	return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate metadata boost based on shared regions and themes
 */
function calculateMetadataBoost(
	current: ContentRelatedEmbedding,
	other: ContentRelatedEmbedding,
): number {
	let boost = 0;

	// Extract arrays from frontmatter, handling various formats
	const getCurrentArray = (key: string): Array<string> => {
		const value = current.frontmatter[key];
		if (Array.isArray(value)) return value.map(String);
		if (typeof value === 'string') return [value];
		return [];
	};

	const getOtherArray = (key: string): Array<string> => {
		const value = other.frontmatter[key];
		if (Array.isArray(value)) return value.map(String);
		if (typeof value === 'string') return [value];
		return [];
	};

	// Theme alignment boost
	const currentThemes = new Set(getCurrentArray('themes'));
	const otherThemes = new Set(getOtherArray('themes'));
	const sharedThemes = [...currentThemes].filter((theme) => otherThemes.has(theme));
	boost += sharedThemes.length * 0.15; // % boost per shared theme

	// Region alignment boost
	const currentRegions = new Set(getCurrentArray('regions'));
	const otherRegions = new Set(getOtherArray('regions'));
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

function getCachedEmbedding(
	cache: ContentRelatedEmbeddingCache,
	contentId: string,
	contentHash: string,
): ContentRelatedEmbedding | undefined {
	const cached = cache[contentId];

	return cached?.hash === contentHash ? cached : undefined;
}

/**
 * Generate embeddings for all content files
 */
async function generateEmbeddings(
	contentFiles: Array<ContentFileMetadata>,
	cacheDir: string,
): Promise<Array<ContentRelatedEmbedding>> {
	const cache = loadCache(cacheDir, values['cache-name'], MODEL_ID);

	const embedder = await pipeline('feature-extraction', MODEL_ID, { dtype: 'fp32' });

	console.log(chalk.green(`✅ Loaded embedding model ${chalk.cyan(MODEL_ID)}`));

	const embeddings: Array<ContentRelatedEmbedding> = [];

	let cacheHits = 0;
	let generated = 0;

	for (let i = 0; i < contentFiles.length; i++) {
		const contentFile = contentFiles[i];

		if (!contentFile?.hash) continue;

		try {
			// Check cache first
			const cachedEmbedding = getCachedEmbedding(cache, contentFile.id, contentFile.hash);

			if (cachedEmbedding) {
				embeddings.push(cachedEmbedding);
				cacheHits++;
			} else {
				const plainTextContent = cleanContent(contentFile.content, contentFile.frontmatter);
				const output = await embedder(plainTextContent, { pooling: 'mean', normalize: true });
				const vector = [...output.data] as Array<number>;

				const embedding: ContentRelatedEmbedding = {
					id: contentFile.id,
					hash: contentFile.hash,
					collection: contentFile.collection,
					frontmatter: contentFile.frontmatter,
					vector,
				};

				embeddings.push(embedding);

				// Update cache in memory
				cache[contentFile.id] = embedding;
				generated++;
			}

			if ((i + 1) % 10 === 0) {
				console.log(
					chalk.blue(
						`Processed ${chalk.cyan(String(i + 1))}/${chalk.cyan(String(contentFiles.length))} embeddings (${chalk.gray(String(cacheHits))} cached, ${chalk.yellow(String(generated))} generated)`,
					),
				);
			}
		} catch (error) {
			console.error(
				chalk.red(`Error processing embedding for ${chalk.cyan(contentFile.id)}:`),
				error,
			);
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
const ContentCollectionPaths = getContentCollectionPaths(
	values['root-path'],
	values['content-path'],
);

async function getContentFiles() {
	const contentFiles = await parseContentFiles(
		[ContentCollectionPaths.Posts, ContentCollectionPaths.Locations],
		{ withHashes: true },
	);

	if (contentFiles.length === 0) {
		console.error(chalk.red('❌ No content found!'));
		process.exit(1);
	}

	// Remove low-quality entries to reduce data processing burden
	/*
	const contentFilesFiltered = contentFiles.filter(
		(file) =>
			!!file.frontmatter.entryQuality &&
			R.isNumber(file.frontmatter.entryQuality) &&
			file.frontmatter.entryQuality >= 2,
	);
	*/

	return contentFiles;
}

/**
 * Main function
 */
async function contentRelated() {
	try {
		console.log(chalk.magenta('=== Related Content Generator ==='));

		const contentFiles = await getContentFiles();

		const cacheDir = path.join(values['root-path'], values['cache-path'], 'content-related');

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

		const embeddings = await generateEmbeddings(contentFiles, cacheDir);

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
