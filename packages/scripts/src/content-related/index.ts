#!/usr/bin/env tsx
import { stripTags, transformMarkdown } from '@spectralcodex/unified-tools';
import { pipeline } from '@xenova/transformers';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ContentCollectionsEnum } from 'packages/scripts/src/content-utils/collections';
import * as R from 'remeda';

import type { ContentFileMetadata } from '../content-utils';

import { parseContentFiles } from '../content-utils';
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
			short: 'c',
			default: 'packages/content',
		},
		'character-limit': {
			type: 'string',
			short: 'l',
			default: '10000',
		},
		'result-count': {
			type: 'string',
			short: 'n',
			default: '5',
		},
	},
});

export interface RelatedContentEmbedding {
	id: string;
	hash: string;
	collection: string;
	vector: Array<number>;
	frontmatter: Record<string, unknown>;
}

interface RelatedContentItem {
	id: string;
	collection: string;
	score: number;
}

type RelatedContentResult = Record<string, Array<RelatedContentItem>>;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

// Clean content for embedding using unified tools
// TODO: use unified system tools to handle MDX; currently this is a big kludge with a lot of regex
function cleanContent(content: string, frontmatter: Record<string, unknown>): string {
	// Get title and description from frontmatter
	const title = typeof frontmatter.title === 'string' ? frontmatter.title : '';
	const description = typeof frontmatter.description === 'string' ? frontmatter.description : '';

	// Preserve Link component content before removing other components
	const contentWithPreservedLinks = content
		// Extract and preserve Link component content: <Link>Content</Link> or <Link id="id">Content</Link>
		.replaceAll(/<Link(?:\s+[^>]*)?>([^<]*)<\/Link>/g, '$1') // Keep the content, remove Link tags
		// Remove footnote references [^1], [^2], etc.
		.replaceAll(/\[\^\d+\]/g, '');

	// Remove other MDX components and their content (custom components we don't care about)
	// Note: We exclude Link from this removal since we handled it above
	const contentWithoutComponents = contentWithPreservedLinks
		.replaceAll(/<(?!Link)[A-Z][^>]*>.*?<\/(?!Link)[A-Z][^>]*>/gs, '') // Remove JSX/MDX components except Link
		.replaceAll(/<(?!Link)[A-Z][^>]*\/>/g, '') // Remove self-closing JSX/MDX components except Link
		.replaceAll(/import\s+.*?from\s+['"][^'"]*['"];?\s*/g, '') // Remove import statements
		.replaceAll(/export\s+.*?;?\s*/g, ''); // Remove export statements

	// Transform markdown to HTML, then strip all HTML tags to get clean text
	const htmlContent = transformMarkdown({ input: contentWithoutComponents });
	const cleanText = stripTags(htmlContent)
		.replaceAll(/\s+/g, ' ') // Normalize whitespace
		.trim();

	// Combine title, description, and content
	return `${title} ${description} ${cleanText}`.slice(0, Number(values['character-limit']));
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
	current: RelatedContentEmbedding,
	other: RelatedContentEmbedding,
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
): Promise<Array<RelatedContentEmbedding>> {
	// Load existing cache
	const cache = loadCache(cacheDir);

	const embedder = await pipeline('feature-extraction', MODEL_ID);

	console.log(`✅ Loaded embedding model ${MODEL_ID}`);

	const embeddings: Array<RelatedContentEmbedding> = [];

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

				const embedding: RelatedContentEmbedding = {
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
					`Processed ${String(i + 1)}/${String(contentFiles.length)} embeddings (${String(cacheHits)} cached, ${String(generated)} generated)`,
				);
			}
		} catch (error) {
			console.error(`Error processing embedding for ${contentFile.id}:`, error);
		}
	}

	// Save updated cache
	saveCache(cache, cacheDir);

	console.log(
		`✅ Generated ${String(embeddings.length)} embeddings (${String(cacheHits)} from cache, ${String(generated)} newly generated)`,
	);

	return embeddings;
}

// Calculate similarities and find top matches
function calculateSimilarities(embeddings: Array<RelatedContentEmbedding>): RelatedContentResult {
	console.log('Calculating relatedness...');

	const result: RelatedContentResult = {};

	for (let i = 0; i < embeddings.length; i++) {
		const current = embeddings[i];
		const relatedContentItems: Array<RelatedContentItem> = [];

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
				`Calculated cosine similarities for ${String(i + 1)}/${String(embeddings.length)} items`,
			);
		}
	}

	return result;
}

async function getContentFiles() {
	const contentPaths = [
		path.join(
			values['root-path'],
			values['content-path'],
			'collections',
			ContentCollectionsEnum.Posts,
		),
		path.join(
			values['root-path'],
			values['content-path'],
			'collections',
			ContentCollectionsEnum.Locations,
		),
	];

	const contentFiles: Array<ContentFileMetadata> = [];

	for (const contentPath of contentPaths) {
		const files = await parseContentFiles(contentPath, { withHashes: true });

		contentFiles.push(...files);
	}

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
		console.log('=== Related Content Generator ===');

		const contentFiles = await getContentFiles();

		if (contentFiles.length === 0) {
			console.error('No content found!');
			process.exit(1);
		}

		const cacheDir = path.join(values['root-path'], values['content-path'], 'data');
		const embeddings = await generateEmbeddings(contentFiles, cacheDir);

		if (embeddings.length === 0) {
			console.error('No embeddings generated!');
			process.exit(1);
		}

		const relatedContentItems = calculateSimilarities(embeddings);

		// Output results
		const outputPath = path.join(
			values['root-path'],
			values['content-path'],
			'data/related-content.json',
		);

		// eslint-disable-next-line unicorn/no-null
		writeFileSync(outputPath, JSON.stringify(relatedContentItems, null, 2));

		console.log(`✅ Related content data written to ${outputPath}`);
		console.log(
			`📊 Generated related content data for ${String(Object.keys(relatedContentItems).length)} items`,
		);
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	}
}

await contentRelated();
