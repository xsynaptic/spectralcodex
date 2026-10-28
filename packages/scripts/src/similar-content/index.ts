import type { ContentEntry } from '@xsynaptic/astro-scripts';

import { pipeline } from '@huggingface/transformers';
import { createSqliteCache } from '@spectralcodex/shared/cache';
import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { entryQualityFloor } from '@spectralcodex/shared/entries';
import { getCachePaths } from '@spectralcodex/shared/paths';
import {
	createProgress,
	formatCount,
	formatError,
	getCollectionEntries,
	log,
	parseNumberOption,
	UserError,
	withAstroContent,
	withSpinner,
} from '@xsynaptic/astro-scripts';
import { sanitizeMdx } from '@xsynaptic/unified-tools';
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Index, MetricKind, ScalarKind } from 'usearch';

import type { SimilarContentMetadata } from '#similar-content/metadata.ts';

import { runCommand } from '#shared/command.ts';
import { toReferenceIds } from '#shared/entries.ts';
import { safelyCreateDirectory } from '#shared/files.ts';
import { calculateMetadataBoost } from '#similar-content/metadata.ts';

const cacheName = 'similar-content-cache';

// Entries are filtered to those carrying a digest, which keys the embedding cache
type EmbeddableEntry = ContentEntry & { digest: string };

interface SimilarContentEmbedding {
	collection: string;
	id: string;
	metadata: SimilarContentMetadata;
	vector: Float32Array;
}

interface SimilarContentItem {
	collection: string;
	id: string;
	score: number;
}

type SimilarContentResult = Record<string, Array<SimilarContentItem>>;

const ModelsEnum = {
	bge: 'Xenova/bge-m3', // 1024 dimensional, multilingual
	gte: 'onnx-community/gte-multilingual-base', // 768 dimensional, multilingual, v4-optimized
	'mini-lm': 'Xenova/all-MiniLM-L6-v2', // 384 dimensional
	'mini-lm-v4': 'onnx-community/all-MiniLM-L6-v2-ONNX', // 384 dimensional, v4-optimized
	mpnet: 'Xenova/all-mpnet-base-v2', // 768 dimensional
} as const;

// English-only but fast; truncates input after 512 tokens (roughly 2500 characters)
const modelKey = 'mpnet' satisfies keyof typeof ModelsEnum;

type FeatureExtractor = Awaited<ReturnType<typeof pipeline<'feature-extraction'>>>;

interface SimilarContentIndex {
	index: Index;
	keyToEmbedding: Map<bigint, SimilarContentEmbedding>;
}

interface SimilarContentQueryOptions extends SimilarContentIndex {
	candidateCount: number;
	minScore: number;
	resultCount: number;
}

// usearch needs numeric BigInt keys, so an embedding is addressed by its position in the array
function buildSimilarContentIndex(
	embeddings: Array<SimilarContentEmbedding>,
	options: { candidateCount: number; dimensions: number },
): SimilarContentIndex {
	const index = new Index({
		connectivity: 16,
		dimensions: options.dimensions,
		expansion_add: 128,
		expansion_search: options.candidateCount * 2, // 2x improves recall without significant slowdown
		metric: MetricKind.Cos,
		multi: false,
		quantization: ScalarKind.F32,
	});
	const keyToEmbedding = new Map<bigint, SimilarContentEmbedding>();

	for (const [position, embedding] of embeddings.entries()) {
		const key = BigInt(position);

		keyToEmbedding.set(key, embedding);
		index.add(key, embedding.vector);
	}

	return { index, keyToEmbedding };
}

function calculateSimilarities(
	embeddings: Array<SimilarContentEmbedding>,
	{ minScore, resultCount }: { minScore: number; resultCount: number },
): SimilarContentResult {
	const firstVector = embeddings[0]?.vector;

	if (!firstVector) {
		throw new Error('No embeddings to process');
	}

	// Over-fetch candidates for re-ranking
	// expansion_search must be >= candidateCount or usearch silently loses recall
	const candidateCount = Math.max(resultCount * 3, 50);

	const { index, keyToEmbedding } = buildSimilarContentIndex(embeddings, {
		candidateCount,
		dimensions: firstVector.length,
	});

	const queryStart = performance.now();
	const result: SimilarContentResult = {};

	for (const current of embeddings) {
		result[current.id] = querySimilarItems(current, {
			candidateCount,
			index,
			keyToEmbedding,
			minScore,
			resultCount,
		});
	}

	log.success(
		`Queried ${formatCount(embeddings.length)} items in ${(performance.now() - queryStart).toFixed(0)}ms`,
	);

	return result;
}

function cleanContent(body: string, data: Record<string, unknown>, characterLimit: number) {
	const title = typeof data.title === 'string' ? data.title : '';
	const description = typeof data.description === 'string' ? data.description : '';
	const content = body && body.length > 0 ? sanitizeMdx(body) : '';

	return `${title} ${description} ${content}`.slice(0, characterLimit);
}

function clearCache(cachePath: string) {
	const cacheFiles = readdirSync(cachePath).filter((file) => file.startsWith(`${cacheName}-`));

	for (const file of cacheFiles) {
		rmSync(path.join(cachePath, file));
	}

	if (cacheFiles.length > 0) {
		log.warn(`Cleared ${String(cacheFiles.length)} cache file(s)`);
	} else {
		log.success('No cache files to clear');
	}
}

async function createVector(
	embedder: FeatureExtractor,
	entry: EmbeddableEntry,
	characterLimit: number,
) {
	const plainTextContent = cleanContent(entry.body ?? '', entry.data, characterLimit);
	const output = await embedder(plainTextContent, { normalize: true, pooling: 'mean' });

	return output.data as Float32Array;
}

// A pooled `Buffer` is not 4-byte aligned, so the bytes are copied rather than viewed
function decodeVector(encoded: string) {
	const bytes = Buffer.from(encoded, 'base64');
	const vector = new Float32Array(bytes.byteLength / Float32Array.BYTES_PER_ELEMENT);

	new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength).set(bytes);

	return vector;
}

function encodeVector(vector: Float32Array) {
	return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).toString('base64');
}

async function generateEmbeddings(
	entries: Array<EmbeddableEntry>,
	{
		cachePath,
		characterLimit,
		signal,
	}: { cachePath: string; characterLimit: number; signal: AbortSignal },
): Promise<Array<SimilarContentEmbedding>> {
	const cache = createSqliteCache<string>(cachePath, getCacheNamespace(characterLimit));

	const modelId = ModelsEnum[modelKey];
	const embedder = await withSpinner(
		`Loading embedding model ${modelId}`,
		() => pipeline('feature-extraction', modelId, { dtype: 'fp32' }),
		() => `Loaded embedding model ${modelId}`,
	);

	const embeddings: Array<SimilarContentEmbedding> = [];

	let cacheHits = 0;
	let generated = 0;

	const progress = createProgress({
		label: 'Embedding',
		note: () => `${formatCount(cacheHits)} cached, ${formatCount(generated)} generated`,
		total: entries.length,
	});

	for (const entry of entries) {
		signal.throwIfAborted();

		try {
			const cachedVector = cache.get(entry.id, entry.digest);
			const vector = cachedVector
				? decodeVector(cachedVector)
				: await createVector(embedder, entry, characterLimit);

			if (cachedVector) {
				cacheHits++;
			} else {
				cache.set(entry.id, entry.digest, encodeVector(vector));
				generated++;
			}

			embeddings.push({
				collection: entry.collection,
				id: entry.id,
				metadata: {
					regions: toReferenceIds(entry.data.regions),
					themes: toReferenceIds(entry.data.themes),
				},
				vector,
			});
		} catch (error) {
			log.error(`Embedding failed for ${entry.id}: ${formatError(error)}`);
		}

		progress.tick();
	}

	progress.succeed();

	return embeddings;
}

// Cache is keyed by model and character limit so changing either invalidates it
function getCacheNamespace(characterLimit: number): string {
	return `${cacheName}-${modelKey}-c${String(characterLimit)}-v2`;
}

async function getContentEntries(): Promise<Array<EmbeddableEntry>> {
	const collectionEntries = await withAstroContent((content) =>
		getCollectionEntries(content, [ContentCollectionsEnum.Posts, ContentCollectionsEnum.Locations]),
	);

	const entries: Array<EmbeddableEntry> = [];

	for (const entry of collectionEntries) {
		if (!entry.digest) continue;

		if (
			'override' in entry.data ||
			typeof entry.data.entryQuality !== 'number' ||
			entry.data.entryQuality < entryQualityFloor.listed
		)
			continue;

		entries.push({ ...entry, digest: String(entry.digest) });
	}

	if (entries.length === 0) throw new UserError('No content found');

	return entries;
}

function querySimilarItems(
	current: SimilarContentEmbedding,
	options: SimilarContentQueryOptions,
): Array<SimilarContentItem> {
	const { candidateCount, index, keyToEmbedding, minScore, resultCount } = options;

	const { distances, keys } = index.search(current.vector, candidateCount, 0);

	const candidates: Array<SimilarContentItem> = [];

	for (const [position, key] of keys.entries()) {
		const distance = distances[position];
		const other = keyToEmbedding.get(key);

		if (!other || other.id === current.id) continue;

		const similarity = Math.max(0, distance === undefined ? 0 : 1 - distance);

		// Blend the boost into the headroom below 1.0 so strong matches never saturate
		const boost = calculateMetadataBoost(current, other);
		// Round to 4 decimals; full float precision just bloats the output JSON
		const score = Math.round((similarity + (1 - similarity) * boost) * 10_000) / 10_000;

		candidates.push({
			collection: other.collection,
			id: other.id,
			score,
		});
	}

	candidates.sort((a, b) => b.score - a.score);

	return candidates.filter((candidate) => candidate.score >= minScore).slice(0, resultCount);
}

await runCommand({
	interrupted: 'embeddings generated so far are cached',
	name: 'similar-content',
	options: {
		'character-limit': {
			default: '2500',
			description: 'Characters of each entry fed to the model',
			type: 'string',
		},
		'clear-cache': {
			default: false,
			description: 'Delete the embedding cache and exit',
			type: 'boolean',
		},
		'min-score': {
			default: '0.4',
			description: 'Lowest similarity score kept',
			type: 'string',
		},
		'result-count': {
			default: '20',
			description: 'Similar items kept per entry',
			type: 'string',
		},
	},
	async run({ paths, signal, values }) {
		safelyCreateDirectory(paths.cachePath);

		if (values['clear-cache']) {
			clearCache(paths.cachePath);
			return;
		}

		const entries = await withSpinner(
			'Loading content',
			getContentEntries,
			(loaded) => `Loaded ${formatCount(loaded.length)} entries`,
		);

		const embeddings = await generateEmbeddings(entries, {
			cachePath: paths.cachePath,
			characterLimit: parseNumberOption(values['character-limit'], 'character-limit'),
			signal,
		});

		if (embeddings.length === 0) throw new UserError('No embeddings generated');

		const similarContentItems = calculateSimilarities(embeddings, {
			minScore: parseNumberOption(values['min-score'], 'min-score'),
			resultCount: parseNumberOption(values['result-count'], 'result-count'),
		});
		const outputPath = getCachePaths(paths.cachePath).similarContentPath;

		writeFileSync(outputPath, JSON.stringify(similarContentItems));

		log.success(
			`Similar content for ${formatCount(Object.keys(similarContentItems).length)} items → ${outputPath}`,
		);
	},
	summary: 'Embed Posts and Locations and write each one’s most similar entries',
	title: 'Similar content',
});
