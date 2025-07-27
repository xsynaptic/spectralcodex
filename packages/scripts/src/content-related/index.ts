#!/usr/bin/env tsx
import { pipeline } from '@xenova/transformers';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ContentCollectionsEnum } from 'packages/scripts/src/content-utils/collections';
import * as R from 'remeda';

import type { ContentFileMetadata } from '../content-utils';

import { parseContentFiles } from '../content-utils';

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
	},
});

interface Embedding {
	id: string;
	vector: Array<number>;
}

interface RelatedContentItem {
	id: string;
	score: number;
}

type RelatedContentResult = Record<string, Array<RelatedContentItem>>;

// Clean content for embedding
function cleanContent(content: string, frontmatter: Record<string, unknown>): string {
	// Get title and description from frontmatter
	const title = typeof frontmatter.title === 'string' ? frontmatter.title : '';
	const description = typeof frontmatter.description === 'string' ? frontmatter.description : '';

	// Basic markdown cleaning
	// TODO: use remark toolchain from the RSS feed
	const cleaned = content
		.replaceAll(/!\[.*?\]\(.*?\)/g, '') // Images
		.replaceAll(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
		.replaceAll(/#{1,6}\s+/g, '') // Headers
		.replaceAll(/\*\*(.*?)\*\*/g, '$1') // Bold
		.replaceAll(/\*(.*?)\*/g, '$1') // Italic
		.replaceAll(/`([^`]+)`/g, '$1') // Inline code
		.replaceAll(/```[\s\S]*?```/g, '') // Code blocks
		.replaceAll(/\n+/g, ' ') // Multiple newlines
		.trim();

	// Combine title, description, and content (limit to 1000 chars for performance)
	return `${title} ${description} ${cleaned}`.slice(0, 1000);
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

// Generate embeddings for all content files
async function generateEmbeddings(
	contentFiles: Array<ContentFileMetadata>,
): Promise<Array<Embedding>> {
	console.log('Loading embedding model...');

	const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

	const embeddings: Array<Embedding> = [];

	console.log('Generating embeddings...');

	for (let i = 0; i < contentFiles.length; i++) {
		const contentFile = contentFiles[i];

		if (!contentFile) continue;

		try {
			const cleanedContent = cleanContent(contentFile.content, contentFile.frontmatter);
			const output = await embedder(cleanedContent, { pooling: 'mean', normalize: true });
			const vector = [...output.data] as Array<number>;

			embeddings.push({
				id: contentFile.id,
				vector,
			});

			if ((i + 1) % 10 === 0) {
				console.log(`Generated ${String(i + 1)}/${String(contentFiles.length)} embeddings`);
			}
		} catch (error) {
			console.error(`Error generating embedding for ${contentFile.id}:`, error);
		}
	}

	console.log(`Generated ${String(embeddings.length)} embeddings`);

	return embeddings;
}

// Calculate similarities and find top matches
function calculateSimilarities(embeddings: Array<Embedding>): RelatedContentResult {
	console.log('Calculating relatedness...');
	const result: RelatedContentResult = {};

	for (let i = 0; i < embeddings.length; i++) {
		const current = embeddings[i];
		const similarities: Array<RelatedContentItem> = [];

		for (const [j, other] of embeddings.entries()) {
			if (i === j || !current) continue;

			const score = cosineSimilarity(current.vector, other.vector);

			similarities.push({
				id: other.id,
				score,
			});
		}

		// Sort by score and take top 5
		similarities.sort((a, b) => b.score - a.score);
		if (current) {
			result[current.id] = similarities.slice(0, 10);
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
		const files = await parseContentFiles(contentPath);

		contentFiles.push(...files);
	}

	// Remove low-quality and hidden entries to reduce data processing burden
	const contentFilesFiltered = contentFiles.filter(
		(file) =>
			!!file.frontmatter.entryQuality &&
			R.isNumber(file.frontmatter.entryQuality) &&
			file.frontmatter.entryQuality >= 2,
	);

	return contentFilesFiltered;
}

async function contentRelated() {
	try {
		console.log('=== SpectralCodex Related Content Generator ===');

		const contentFiles = await getContentFiles();

		if (contentFiles.length === 0) {
			console.error('No content found!');
			process.exit(1);
		}

		// Generate embeddings
		const embeddings = await generateEmbeddings(contentFiles);

		if (embeddings.length === 0) {
			console.error('No embeddings generated!');
			process.exit(1);
		}

		// Calculate similarities
		const similarities = calculateSimilarities(embeddings);

		// Output results
		const outputPath = path.join(values['root-path'], 'temp/related-content.json');

		// eslint-disable-next-line unicorn/no-null
		writeFileSync(outputPath, JSON.stringify(similarities, null, 2));

		console.log(`✅ Similarity data written to ${outputPath}`);
		console.log(`📊 Generated similarities for ${String(Object.keys(similarities).length)} items`);
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	}
}

await contentRelated();
