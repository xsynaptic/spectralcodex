#!/usr/bin/env tsx
import { pipeline } from '@huggingface/transformers';
import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { sanitizeMdx } from '@xsynaptic/unified-tools';
import chalk from 'chalk';
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Index, MetricKind, ScalarKind } from 'usearch';

import type { ContentEntry } from '#shared/astro-content.ts';

import { getCollectionEntries, withAstroContent } from '#shared/astro-content.ts';
import { getFileCacheInstance } from '#shared/cache-file.ts';
import { toReferenceIds } from '#shared/entries.ts';
import { findWorkspaceRoot, safelyCreateDirectory } from '#shared/utils.ts';

import type { SimilarContentMetadata } from './metadata.ts';

import { calculateMetadataBoost } from './metadata.ts';

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'cache-path': {
			type: 'string',
			default: './.cache',
		},
		'cache-name': {
			type: 'string',
			default: 'similar-content-cache',
		},
		'output-path': {
			type: 'string',
			default: './.cache',
		},
		'output-name': {
			type: 'string',
			default: 'similar-content.json',
		},
		'progress-count': {
			type: 'string',
			default: '50',
		},
		'character-limit': {
			type: 'string',
			default: '2500',
		},
		'result-count': {
			type: 'string',
			default: '20',
		},
		'min-score': {
			type: 'string',
			default: '0.4',
		},
		'clear-cache': {
			type: 'boolean',
			default: false,
		},
	},
});

// Entries are filtered to those carrying a digest, which keys the embedding cache
type EmbeddableEntry = ContentEntry & { digest: string };

interface SimilarContentEmbedding {
	id: string;
	digest: string;
	collection: string;
	vector: Array<number>;
	metadata: SimilarContentMetadata;
}

interface SimilarContentItem {
	id: string;
	collection: string;
	score: number;
}

type SimilarContentResult = Record<string, Array<SimilarContentItem>>;

/**
 * Models; a small sampling of some options; more complex models are more accurate but slower
 * Note 1: changing models will regenerate all embeddings (cache is namespaced by model and character limit)
 * Note 2: different models have different dimensionalities and input limitations
 */
const ModelsEnum = {
	'mini-lm': 'Xenova/all-MiniLM-L6-v2', // 384 dimensional
	'mini-lm-v4': 'onnx-community/all-MiniLM-L6-v2-ONNX', // 384 dimensional, v4-optimized
	mpnet: 'Xenova/all-mpnet-base-v2', // 768 dimensional
	bge: 'Xenova/bge-m3', // 1024 dimensional, multilingual
	gte: 'onnx-community/gte-multilingual-base', // 768 dimensional, multilingual, v4-optimized
} as const;

// English-only but fast; truncates input after 512 tokens (roughly 2500 characters)
const modelKey = 'mpnet' satisfies keyof typeof ModelsEnum;

// Clean content for embedding using unified tools
function cleanContent(body: string, data: Record<string, unknown>): string {
	const title = typeof data.title === 'string' ? data.title : '';
	const description = typeof data.description === 'string' ? data.description : '';
	const content = body && body.length > 0 ? sanitizeMdx(body) : '';

	return `${title} ${description} ${content}`.slice(0, Number(values['character-limit']));
}

// Cache is keyed by model and character limit so changing either invalidates it
function getCacheNamespace(): string {
	return `${values['cache-name']}-${modelKey}-c${values['character-limit']}-v2`;
}

type FeatureExtractor = Awaited<ReturnType<typeof pipeline<'feature-extraction'>>>;

async function createEmbedding(
	embedder: FeatureExtractor,
	entry: EmbeddableEntry,
	digest: string,
): Promise<SimilarContentEmbedding> {
	const plainTextContent = cleanContent(entry.body ?? '', entry.data);
	const output = await embedder(plainTextContent, { pooling: 'mean', normalize: true });

	return {
		id: entry.id,
		digest,
		collection: entry.collection,
		metadata: {
			themes: toReferenceIds(entry.data.themes),
			regions: toReferenceIds(entry.data.regions),
		},
		vector: [...output.data] as Array<number>,
	};
}

// Generate embeddings for all content entries
async function generateEmbeddings(
	entries: Array<EmbeddableEntry>,
): Promise<Array<SimilarContentEmbedding>> {
	const cachePath = path.join(rootPath, values['cache-path']);
	const cacheNamespace = getCacheNamespace();
	const cache = getFileCacheInstance(cachePath, cacheNamespace);

	const modelId = ModelsEnum[modelKey];
	const embedder = await pipeline('feature-extraction', modelId, { dtype: 'fp32' });

	console.log(chalk.green(`✅ Loaded embedding model ${chalk.cyan(modelId)}`));

	const embeddings: Array<SimilarContentEmbedding> = [];

	let cacheHits = 0;
	let generated = 0;

	for (const [index, entry] of entries.entries()) {
		if (!entry.digest) continue;

		try {
			const cachedEmbedding = await cache.get<SimilarContentEmbedding>(entry.id);

			if (cachedEmbedding?.digest === entry.digest) {
				embeddings.push(cachedEmbedding);
				cacheHits++;
			} else {
				const embedding = await createEmbedding(embedder, entry, entry.digest);

				embeddings.push(embedding);

				await cache.set(entry.id, embedding);
				generated++;
			}

			if ((index + 1) % Number(values['progress-count']) === 0) {
				console.log(
					chalk.blue(
						`Processed ${chalk.cyan(String(index + 1))}/${chalk.cyan(String(entries.length))} embeddings (${chalk.gray(String(cacheHits))} cached, ${chalk.yellow(String(generated))} generated)`,
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

interface SimilarContentIndex {
	index: Index;
	keyToEmbedding: Map<bigint, SimilarContentEmbedding>;
}

// usearch needs numeric BigInt keys, so an embedding is addressed by its position in the array
function buildSimilarContentIndex(
	embeddings: Array<SimilarContentEmbedding>,
	options: { dimensions: number; candidateCount: number },
): SimilarContentIndex {
	const index = new Index({
		metric: MetricKind.Cos,
		dimensions: options.dimensions,
		connectivity: 16,
		quantization: ScalarKind.F32,
		expansion_add: 128,
		expansion_search: options.candidateCount * 2, // 2x improves recall without significant slowdown
		multi: false,
	});
	const keyToEmbedding = new Map<bigint, SimilarContentEmbedding>();

	for (const [position, embedding] of embeddings.entries()) {
		const key = BigInt(position);

		keyToEmbedding.set(key, embedding);
		index.add(key, new Float32Array(embedding.vector));
	}

	return { index, keyToEmbedding };
}

interface SimilarContentQueryOptions extends SimilarContentIndex {
	candidateCount: number;
	minScore: number;
	resultCount: number;
}

function querySimilarItems(
	current: SimilarContentEmbedding,
	options: SimilarContentQueryOptions,
): Array<SimilarContentItem> {
	const { index, keyToEmbedding, candidateCount, minScore, resultCount } = options;

	const { keys, distances } = index.search(new Float32Array(current.vector), candidateCount, 0);

	const candidates: Array<SimilarContentItem> = [];

	for (const [position, key] of keys.entries()) {
		const distance = distances[position];
		const other = keyToEmbedding.get(key);

		if (!other || other.id === current.id) continue;

		// Convert usearch's cosine distance to a similarity score
		const similarity = Math.max(0, distance === undefined ? 0 : 1 - distance);

		// Blend the boost into the headroom below 1.0 so strong matches never saturate
		const boost = calculateMetadataBoost(current, other);
		// Round to 4 decimals; full float precision just bloats the output JSON
		const score = Math.round((similarity + (1 - similarity) * boost) * 10_000) / 10_000;

		candidates.push({
			id: other.id,
			collection: other.collection,
			score,
		});
	}

	candidates.sort((a, b) => b.score - a.score);

	return candidates.filter((candidate) => candidate.score >= minScore).slice(0, resultCount);
}

// Calculate similarities using usearch ANN index
function calculateSimilarities(embeddings: Array<SimilarContentEmbedding>): SimilarContentResult {
	const firstVector = embeddings[0]?.vector;

	if (!firstVector) {
		throw new Error('No embeddings to process');
	}

	const resultCount = Number(values['result-count']);
	const minScore = Number(values['min-score']);

	// Over-fetch candidates for re-ranking
	// expansion_search must be >= candidateCount or usearch silently loses recall
	const candidateCount = Math.max(resultCount * 3, 50);

	const { index, keyToEmbedding } = buildSimilarContentIndex(embeddings, {
		dimensions: firstVector.length,
		candidateCount,
	});

	console.log(chalk.blue('Querying for similar content...'));

	const queryStart = performance.now();
	const result: SimilarContentResult = {};

	for (const current of embeddings) {
		result[current.id] = querySimilarItems(current, {
			index,
			keyToEmbedding,
			candidateCount,
			minScore,
			resultCount,
		});
	}

	console.log(
		chalk.green(
			`✅ Queried ${chalk.cyan(String(embeddings.length))} items in ${chalk.cyan((performance.now() - queryStart).toFixed(2))}ms`,
		),
	);

	return result;
}

async function getContentEntries(): Promise<Array<EmbeddableEntry>> {
	const collectionEntries = await withAstroContent((content) =>
		getCollectionEntries(content, [ContentCollectionsEnum.Posts, ContentCollectionsEnum.Locations]),
	);

	const entries: Array<EmbeddableEntry> = [];

	for (const entry of collectionEntries) {
		if (!entry.digest) continue;

		if (typeof entry.data.entryQuality !== 'number' || entry.data.entryQuality < 2) continue;

		entries.push({ ...entry, digest: String(entry.digest) });
	}

	if (entries.length === 0) {
		console.error(chalk.red('❌ No content found!'));
		process.exit(1);
	}

	return entries;
}

async function similarContent() {
	try {
		console.log(chalk.magenta('=== Similar Content Generator ==='));

		safelyCreateDirectory(path.join(rootPath, values['cache-path']));

		if (values['clear-cache']) {
			const cacheDir = path.join(rootPath, values['cache-path']);
			const cacheName = values['cache-name'];
			const cacheFiles = readdirSync(cacheDir).filter(
				(file) => file.startsWith(`${cacheName}-`) && file.endsWith('.json'),
			);
			for (const file of cacheFiles) {
				rmSync(path.join(cacheDir, file));
			}
			if (cacheFiles.length > 0) {
				console.log(chalk.yellow(`🗑️  Cleared ${String(cacheFiles.length)} cache file(s)`));
			} else {
				console.log(chalk.green('🗑️  No cache files to clear'));
			}
			process.exit(0);
		}

		const entries = await getContentEntries();

		console.log(chalk.gray(`Processing ${String(entries.length)} entries`));

		const totalStart = performance.now();

		const embeddings = await generateEmbeddings(entries);

		if (embeddings.length === 0) {
			console.error(chalk.red('❌ No embeddings generated!'));
			process.exit(1);
		}

		const similarContentItems = calculateSimilarities(embeddings);
		const outputPath = path.join(rootPath, values['output-path'], values['output-name']);

		writeFileSync(outputPath, JSON.stringify(similarContentItems));

		const totalTime = ((performance.now() - totalStart) / 1000).toFixed(2);

		console.log(
			chalk.green(
				`✅ Similar content data for ${chalk.cyan(String(Object.keys(similarContentItems).length))} items written to ${chalk.cyan(outputPath)}`,
			),
		);
		console.log(chalk.magenta(`Total time: ${chalk.cyan(totalTime)}s`));
	} catch (error) {
		console.error(chalk.red('❌ Error:'), error);
		process.exit(1);
	}
}

await similarContent();
