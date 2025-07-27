#!/usr/bin/env tsx
import { pipeline } from '@xenova/transformers';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { ContentCollectionFileMetadata } from '../content-utils';

import { parseContentCollectionFiles } from '../content-utils';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			short: 'r',
			default: process.cwd(),
		},
	},
});

interface Embedding {
	slug: string;
	vector: Array<number>;
}

interface SimilarPost {
	slug: string;
	score: number;
}

type SimilarityResult = Record<string, Array<SimilarPost>>;

// Clean content for embedding
function cleanContent(content: string, frontmatter: Record<string, unknown>): string {
	// Get title and description from frontmatter
	const title = typeof frontmatter.title === 'string' ? frontmatter.title : '';
	const description = typeof frontmatter.description === 'string' ? frontmatter.description : '';

	// Basic markdown cleaning
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

// Generate embeddings for all posts
async function generateEmbeddings(
	posts: Array<ContentCollectionFileMetadata>,
): Promise<Array<Embedding>> {
	console.log('Loading embedding model...');

	const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

	const embeddings: Array<Embedding> = [];

	console.log('Generating embeddings...');

	for (let i = 0; i < posts.length; i++) {
		const post = posts[i];

		if (!post) continue;

		try {
			const cleanedContent = cleanContent(post.content, post.frontmatter);
			const output = await embedder(cleanedContent, { pooling: 'mean', normalize: true });
			const vector = [...output.data] as Array<number>;

			embeddings.push({
				slug: post.id,
				vector,
			});

			if ((i + 1) % 10 === 0) {
				console.log(`Generated ${String(i + 1)}/${String(posts.length)} embeddings`);
			}
		} catch (error) {
			console.error(`Error generating embedding for ${post.id}:`, error);
		}
	}

	console.log(`Generated ${String(embeddings.length)} embeddings`);
	return embeddings;
}

// Calculate similarities and find top matches
function calculateSimilarities(embeddings: Array<Embedding>): SimilarityResult {
	console.log('Calculating similarities...');
	const result: SimilarityResult = {};

	for (let i = 0; i < embeddings.length; i++) {
		const current = embeddings[i];
		const similarities: Array<SimilarPost> = [];

		for (const [j, other] of embeddings.entries()) {
			if (i === j || !current) continue;

			const score = cosineSimilarity(current.vector, other.vector);

			similarities.push({
				slug: other.slug,
				score,
			});
		}

		// Sort by score and take top 5
		similarities.sort((a, b) => b.score - a.score);
		if (current) {
			result[current.slug] = similarities.slice(0, 5);
		}

		if ((i + 1) % 50 === 0) {
			console.log(
				`Calculated similarities for ${String(i + 1)}/${String(embeddings.length)} posts`,
			);
		}
	}

	return result;
}

// Main execution
async function main() {
	try {
		console.log('=== SpectralCodex Related Content Generator ===');

		const contentPath = path.join(values['root-path'], 'packages/content/collections/posts');

		const posts = await parseContentCollectionFiles(contentPath);

		if (posts.length === 0) {
			console.error('No posts found!');
			process.exit(1);
		}

		// Generate embeddings
		const embeddings = await generateEmbeddings(posts);

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
		console.log(`📊 Generated similarities for ${String(Object.keys(similarities).length)} posts`);
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	}
}

await main();
