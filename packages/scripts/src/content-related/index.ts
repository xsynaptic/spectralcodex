#!/usr/bin/env tsx
import { pipeline } from '@huggingface/transformers';
import slugify from '@sindresorhus/slugify';
import { getFileCacheInstance } from '@spectralcodex/shared/cache/file';
import { ContentCollectionsEnum } from '@spectralcodex/shared/schemas';
import { sanitizeMdx } from '@xsynaptic/unified-tools';
import chalk from 'chalk';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Index, MetricKind, ScalarKind } from 'usearch';

import type { DataStoreEntry } from '../content-utils/data-store.js';

import { getDataStoreCollection, loadDataStore } from '../content-utils/data-store.js';

/**
 * Arguments
 */
const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			default: process.cwd(),
		},
		'data-store-path': {
			type: 'string',
			default: '.astro/data-store.json',
		},
		'cache-path': {
			type: 'string',
			default: './.cache',
		},
		'cache-name': {
			type: 'string',
			default: 'content-related-cache',
		},
		'output-path': {
			type: 'string',
			default: './temp',
		},
		'output-name': {
			type: 'string',
			default: 'content-related.json',
		},
		'progress-count': {
			type: 'string',
			default: '50',
		},
		'character-limit': {
			type: 'string',
			default: '5000',
		},
		'result-count': {
			type: 'string',
			default: '25',
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

interface ContentRelatedItem {
	id: string;
	collection: string;
	score: number;
}

type ContentRelatedResult = Record<string, Array<ContentRelatedItem>>;

/**
 * Models; a small sampling of some options; more complex models are more accurate but slower
 */
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
function cleanContent(body: string, data: Record<string, unknown>): string {
	const title = typeof data.title === 'string' ? data.title : '';
	const description = typeof data.description === 'string' ? data.description : '';
	const content = body && body.length > 0 ? sanitizeMdx(body) : '';

	// Combine title, description, and content; the model will consume it as-is
	return `${title} ${description} ${content}`.slice(0, Number(values['character-limit']));
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
 * Get cache namespace that includes model ID for cache isolation between models
 */
function getCacheNamespace(cacheName: string, modelId: string): string {
	return `${cacheName}-${slugify(modelId, { lowercase: true })}`;
}

/**
 * Generate embeddings for all content entries
 */
async function generateEmbeddings(
	entries: Array<ContentEntry>,
): Promise<Array<ContentRelatedEmbedding>> {
	const cachePath = path.join(values['root-path'], values['cache-path']);
	const cacheNamespace = getCacheNamespace(values['cache-name'], MODEL_ID);
	const cache = getFileCacheInstance(cachePath, cacheNamespace);

	const embedder = await pipeline('feature-extraction', MODEL_ID, { dtype: 'fp32' });

	console.log(chalk.green(`✅ Loaded embedding model ${chalk.cyan(MODEL_ID)}`));

	const embeddings: Array<ContentRelatedEmbedding> = [];

	let cacheHits = 0;
	let generated = 0;

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];

		if (!entry?.digest) continue;

		try {
			const cachedEmbedding = await cache.get<ContentRelatedEmbedding>(entry.id);

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

				await cache.set(entry.id, embedding);
				generated++;
			}

			if ((i + 1) % Number(values['progress-count']) === 0) {
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

	console.log(
		chalk.green(
			`✅ Generated ${chalk.cyan(String(embeddings.length))} embeddings (${chalk.gray(String(cacheHits))} from cache, ${chalk.yellow(String(generated))} newly generated)`,
		),
	);

	return embeddings;
}

/**
 * Calculate similarities using usearch ANN index
 */
function calculateSimilarities(embeddings: Array<ContentRelatedEmbedding>): ContentRelatedResult {
	const firstVector = embeddings[0]?.vector;

	if (!firstVector) {
		throw new Error('No embeddings to process');
	}

	// Build ID mappings (usearch needs numeric BigInt keys)
	const idToKey = new Map<string, bigint>();
	const keyToEmbedding = new Map<bigint, ContentRelatedEmbedding>();

	for (const [index, embedding] of embeddings.entries()) {
		const key = BigInt(index);

		idToKey.set(embedding.id, key);
		keyToEmbedding.set(key, embedding);
	}

	// Create and populate the index
	const index = new Index({
		metric: MetricKind.Cos,
		dimensions: firstVector.length,
		connectivity: 16,
		quantization: ScalarKind.F32,
		expansion_add: 128,
		expansion_search: 64,
		multi: false,
	});

	for (const emb of embeddings) {
		const key = idToKey.get(emb.id);

		if (key !== undefined) index.add(key, new Float32Array(emb.vector));
	}

	// Query for similar items and re-rank with metadata boost
	console.log(chalk.blue('Querying for related content...'));

	const queryStart = performance.now();
	const result: ContentRelatedResult = {};
	const resultCount = Number(values['result-count']);
	const candidateCount = Math.max(resultCount * 5, 50); // Fetch extra for re-ranking

	for (const current of embeddings) {
		const { keys, distances } = index.search(new Float32Array(current.vector), candidateCount, 0);

		const candidates: Array<ContentRelatedItem> = [];

		for (const [i, key] of keys.entries()) {
			const distance = distances[i];

			const other = keyToEmbedding.get(key);

			if (!other || other.id === current.id) continue;

			// Convert cosine distance to similarity (usearch returns distance, not similarity)
			const similarity = distance === undefined ? 0 : 1 - distance;
			const boost = calculateMetadataBoost(current, other);

			candidates.push({
				id: other.id,
				collection: other.collection,
				score: similarity + boost,
			});
		}

		// Sort by score and take top results
		candidates.sort((a, b) => b.score - a.score);
		result[current.id] = candidates.slice(0, resultCount);
	}

	console.log(
		chalk.green(
			`✅ Queried ${chalk.cyan(String(embeddings.length))} items in ${chalk.cyan((performance.now() - queryStart).toFixed(2))}ms`,
		),
	);

	return result;
}

/**
 * Content handling
 */
function getContentEntries(dataStorePath: string): Array<ContentEntry> {
	const { collections, path: resolvedPath } = loadDataStore(dataStorePath);

	console.log(chalk.gray(`Loaded data store from: ${resolvedPath}`));

	const entries: Array<ContentEntry> = [];

	// Get entries from posts and locations collections
	for (const collectionName of [ContentCollectionsEnum.Posts, ContentCollectionsEnum.Locations]) {
		const collectionEntries = getDataStoreCollection(collections, collectionName);

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

		const dataStorePath = path.join(values['root-path'], values['data-store-path']);

		mkdirSync(path.join(values['root-path'], values['cache-path']), { recursive: true });

		if (values['clear-cache']) {
			const cacheDir = path.join(values['root-path'], values['cache-path']);
			const cacheNamespace = getCacheNamespace(values['cache-name'], MODEL_ID);
			const cacheFiles = readdirSync(cacheDir).filter((file) => file === `${cacheNamespace}.json`);
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

		const totalStart = performance.now();

		const embeddings = await generateEmbeddings(entries);

		if (embeddings.length === 0) {
			console.error(chalk.red('❌ No embeddings generated!'));
			process.exit(1);
		}

		const relatedContentItems = calculateSimilarities(embeddings);
		const outputPath = path.join(values['root-path'], values['output-path'], values['output-name']);

		// eslint-disable-next-line unicorn/no-null
		writeFileSync(outputPath, JSON.stringify(relatedContentItems, null, 2));

		const totalTime = ((performance.now() - totalStart) / 1000).toFixed(2);

		console.log(
			chalk.green(
				`✅ Related content data for ${chalk.cyan(String(Object.keys(relatedContentItems).length))} items written to ${chalk.cyan(outputPath)}`,
			),
		);
		console.log(chalk.magenta(`Total time: ${chalk.cyan(totalTime)}s`));
	} catch (error) {
		console.error(chalk.red('❌ Error:'), error);
		process.exit(1);
	}
}

await contentRelated();
