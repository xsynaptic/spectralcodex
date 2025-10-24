#!/usr/bin/env tsx
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';
import sharp from 'sharp';

import { ContentCollectionsEnum } from '../content-utils/collections.js';
import { parseContentFiles } from '../content-utils/index.js';

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
		'output-path': {
			type: 'string',
			short: 'o',
			default: './public/0g',
		},
	},
});

// OG image dimensions and settings
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_DENSITY = 2;
const OG_FORMAT = 'jpg';
const OG_QUALITY = 85;

type ImageFeatured = string | { id: string } | Array<string | { id: string }>;

interface ContentEntry {
	id: string;
	imageFeatured?: ImageFeatured;
}

/**
 * Get the first image ID from imageFeatured (string, object, or array)
 * Replicates logic from src/lib/image/image-featured.ts
 */
function getImageFeaturedId(imageFeatured: ImageFeatured | undefined): string | undefined {
	if (!imageFeatured) return undefined;

	// If it's an array, get the first item
	if (Array.isArray(imageFeatured)) return getImageFeaturedId(imageFeatured[0]);

	// If it's an object with id, return the id, otherwise return the string
	return typeof imageFeatured === 'object' && 'id' in imageFeatured
		? imageFeatured.id
		: imageFeatured;
}

async function getContentEntries(): Promise<Array<ContentEntry>> {
	console.log(chalk.blue('Reading content collections...'));

	const collections = [
		ContentCollectionsEnum.Ephemera,
		ContentCollectionsEnum.Locations,
		ContentCollectionsEnum.Pages,
		ContentCollectionsEnum.Posts,
		ContentCollectionsEnum.Regions,
		ContentCollectionsEnum.Series,
		ContentCollectionsEnum.Themes,
	];

	const allEntries: Array<ContentEntry> = [];

	for (const collection of collections) {
		const collectionPath = path.join(
			values['root-path'],
			values['content-path'],
			'collections',
			collection,
		);

		const files = await parseContentFiles(collectionPath);

		for (const file of files) {
			const imageFeatured = file.frontmatter.imageFeatured as ImageFeatured | undefined;

			if (imageFeatured) {
				allEntries.push({
					id: file.id,
					imageFeatured,
				});
			}
		}
	}

	console.log(chalk.green(`Found ${String(allEntries.length)} entries with featured images`));

	return allEntries;
}

/**
 * Get the absolute path to a source image
 * Image IDs are paths relative to content/media (e.g., "taiwan/taichung/taichung-1.jpg")
 */
async function getSourceImagePath(imageId: string): Promise<string | undefined> {
	const imagePath = path.join(values['root-path'], values['content-path'], 'media', imageId);

	// Verify the image exists on disk and is readable (never write to source images!)
	try {
		await fs.access(imagePath, fs.constants.R_OK);
		return imagePath;
	} catch {
		return undefined;
	}
}

/**
 * Check if output image exists and compare modification times
 * Returns true if regeneration is needed
 */
async function shouldRegenerateImage(
	sourceImagePath: string,
	outputImagePath: string,
): Promise<boolean> {
	try {
		// Check if output exists
		await fs.access(outputImagePath);

		// Get file stats
		const [sourceStats, outputStats] = await Promise.all([
			fs.stat(sourceImagePath),
			fs.stat(outputImagePath),
		]);

		// Regenerate if source is newer than output
		return sourceStats.mtime > outputStats.mtime;
	} catch {
		// Output doesn't exist, need to generate
		return true;
	}
}

async function generateOpenGraphImage(
	entry: ContentEntry,
): Promise<{ status: 'success' | 'skipped' | 'error' }> {
	try {
		const imageId = getImageFeaturedId(entry.imageFeatured);

		if (!imageId) {
			return { status: 'error' };
		}

		const sourceImagePath = await getSourceImagePath(imageId);

		if (!sourceImagePath) {
			console.log(chalk.yellow(`Warning: Source image not found for ${entry.id} (${imageId})`));
			return { status: 'error' };
		}

		const outputPath = path.join(values['root-path'], values['output-path']);
		await fs.mkdir(outputPath, { recursive: true });

		const outputFilePath = path.join(outputPath, `${entry.id}.${OG_FORMAT}`);

		// Check if we need to regenerate
		const needsRegeneration = await shouldRegenerateImage(sourceImagePath, outputFilePath);

		if (!needsRegeneration) {
			return { status: 'skipped' };
		}

		// Generate OG image (only reads from source, writes to output)
		await sharp(sourceImagePath)
			.resize({
				fit: 'cover',
				height: OG_HEIGHT * OG_DENSITY,
				width: OG_WIDTH * OG_DENSITY,
			})
			.toFormat(OG_FORMAT, { quality: OG_QUALITY })
			.toFile(outputFilePath);

		return { status: 'success' };
	} catch (error) {
		console.error(chalk.red(`Error generating OG image for ${entry.id}:`), error);
		return { status: 'error' };
	}
}

async function generateAllOpenGraphImages() {
	console.log(chalk.magenta('=== OpenGraph Image Generator ==='));

	try {
		const entries = await getContentEntries();

		if (entries.length === 0) {
			console.log(chalk.yellow('No entries with featured images found.'));
			return;
		}

		console.log(chalk.blue(`Processing ${String(entries.length)} entries...`));

		const limit = pLimit(40);
		let generatedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		await Promise.all(
			entries.map((entry) =>
				limit(async () => {
					const result = await generateOpenGraphImage(entry);
					if (result.status === 'success') {
						generatedCount++;
					} else if (result.status === 'skipped') {
						skippedCount++;
					} else {
						errorCount++;
					}
				}),
			),
		);

		console.log(chalk.green(`✅ Generated ${String(generatedCount)} new OpenGraph images`));
		if (skippedCount > 0) {
			console.log(chalk.blue(`⏭️  Skipped ${String(skippedCount)} up-to-date images`));
		}
		if (errorCount > 0) {
			console.log(chalk.yellow(`⚠️  ${String(errorCount)} errors encountered`));
		}
	} catch (error) {
		console.error(chalk.red('❌ Error:'), error);
		process.exit(1);
	}
}

await generateAllOpenGraphImages();
