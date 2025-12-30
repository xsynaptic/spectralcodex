#!/usr/bin/env tsx
import { pipeline } from '@xenova/transformers';
import { sanitizeMdx } from '@xsynaptic/unified-tools';
import chalk from 'chalk';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as R from 'remeda';

import type { ContentFileMetadata } from '../content-utils';

import { parseContentFiles } from '../content-utils';
import { getContentCollectionPaths } from '../content-utils/collections';
import { getCachedEmbedding, loadCache, saveCache } from './vector-cache.js';

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
		'character-limit': {
			type: 'string',
			short: 'l',
			default: '10000',
		},
		'result-count': {
			type: 'string',
			short: 'n',
			default: '10',
		},
	},
});

export interface ContentRelatedEmbedding {
	id: string;
	hash: string;
	collection: string;
	vector: Array<number>;
	frontmatter: Record<string, unknown>;
}

interface ContentRelatedItem {
	id: string;
	collection: string;
	score: number;
}

type ContentRelatedResult = Record<string, Array<ContentRelatedItem>>;

// Some recommended models to experiment with; more complex models are more accurate but slower
const ModelIdEnum = {
	MiniLm: 'Xenova/all-MiniLM-L6-v2', // 384 dimensional
	MpNet: 'Xenova/all-mpnet-base-v2', // 768 dimensional
	Bge: 'Xenova/bge-m3', // 1024 dimensional, multilingual
} as const;

// Note: when changing models be sure to manually delete the cache!
const MODEL_ID = ModelIdEnum.MpNet;

// Clean content for embedding using unified tools
function cleanContent(contentRaw: string, frontmatter: Record<string, unknown>): string {
	const title = typeof frontmatter.title === 'string' ? frontmatter.title : '';
	const description = typeof frontmatter.description === 'string' ? frontmatter.description : '';
	const content = sanitizeMdx(contentRaw);

	// Combine title, description, and content; the model will consume it as-is
	return `${title} ${description} ${content}`.slice(0, Number(values['character-limit']));
}

// Cosine similarity function
function cosineSimilarity(vecA: Array<number>, vecB: Array<number>): number {
	if (vecA.length !== vecB.length) {
		throw new Error('Vectors must have the same dimensions');
	}

	const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i]!, 0);
	const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
	const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

	if (magnitudeA === 0 || magnitudeB === 0) {
		return 0;
	}

	return dotProduct / (magnitudeA * magnitudeB);
}

// Calculate metadata boost based on shared regions and themes
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

// Generate embeddings for all content files
async function generateEmbeddings(
	contentFiles: Array<ContentFileMetadata>,
	cacheDir: string,
): Promise<Array<ContentRelatedEmbedding>> {
	// Load existing cache
	const cache = loadCache(cacheDir);

	const embedder = await pipeline('feature-extraction', MODEL_ID);

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
				// Generate new embedding
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
	saveCache(cache, cacheDir);

	console.log(
		chalk.green(
			`✅ Generated ${chalk.cyan(String(embeddings.length))} embeddings (${chalk.gray(String(cacheHits))} from cache, ${chalk.yellow(String(generated))} newly generated)`,
		),
	);

	return embeddings;
}

// Calculate similarities and find top matches
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

const ContentCollectionPaths = getContentCollectionPaths(
	values['root-path'],
	values['content-path'],
);

async function getContentFiles() {
	const contentFiles = await parseContentFiles(
		[ContentCollectionPaths.Posts, ContentCollectionPaths.Locations],
		{ withHashes: true },
	);

	// Remove low-quality entries to reduce data processing burden
	const contentFilesFiltered = contentFiles.filter(
		(file) =>
			!!file.frontmatter.entryQuality &&
			R.isNumber(file.frontmatter.entryQuality) &&
			file.frontmatter.entryQuality >= 2 &&
			!!file.frontmatter.imageFeatured,
	);

	return contentFilesFiltered;
}

async function contentRelated() {
	try {
		console.log(chalk.magenta('=== Related Content Generator ==='));

		const contentFiles = await getContentFiles();

		if (contentFiles.length === 0) {
			console.error(chalk.red('❌ No content found!'));
			process.exit(1);
		}

		const cacheDir = path.join(values['root-path'], values['cache-path'], 'content-related');

		mkdirSync(cacheDir, { recursive: true });

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
