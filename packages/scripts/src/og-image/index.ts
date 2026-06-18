#!/usr/bin/env tsx
import { getFileCacheInstance } from '@spectralcodex/shared/cache/file';
import {
	OPEN_GRAPH_CACHE_NAMESPACE,
	OPEN_GRAPH_IMAGE_FORMAT,
	OPEN_GRAPH_IMAGE_HEIGHT,
	OPEN_GRAPH_IMAGE_WIDTH,
	OPEN_GRAPH_OUTPUT_PATH,
} from '@spectralcodex/shared/constants';
import chalk from 'chalk';
import { rmSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';
import sharp from 'sharp';

import type { OpenGraphFontConfig } from './types.js';

import { findWorkspaceRoot, safelyCreateDirectory } from '../shared/utils.js';
import { getBuiltEntries } from './content.js';
import { loadFonts } from './fonts.js';
import { createGenerator } from './generate.js';

const rootPath = findWorkspaceRoot();

async function getFileExists(filePath: string): Promise<boolean> {
	try {
		await fs.stat(filePath);
		return true;
	} catch {
		return false;
	}
}

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'data-store-path': {
			type: 'string',
			default: '.astro/data-store.json',
		},
		'dist-path': {
			type: 'string',
			default: './dist',
		},
		'media-path': {
			type: 'string',
			default: 'packages/content/media',
		},
		'output-path': {
			type: 'string',
			default: OPEN_GRAPH_OUTPUT_PATH,
		},
		'cache-path': {
			type: 'string',
			default: './.cache',
		},
		'clear-cache': {
			type: 'boolean',
			default: false,
		},
	},
});

// Font configuration
const FONT_CONFIGS: Array<OpenGraphFontConfig> = [
	{
		package: 'lora',
		name: 'Lora',
		variants: [{ weight: 700, style: 'normal', subset: 'latin' }],
	},
	{
		package: 'noto-serif-tc',
		name: 'Noto Serif TC',
		variants: [{ weight: 700, style: 'normal', subset: 'chinese-traditional' }],
	},
	{
		package: 'noto-serif-thai',
		name: 'Noto Serif Thai',
		variants: [{ weight: 500, style: 'normal', subset: 'thai' }],
	},
	{
		package: 'zen-antique',
		name: 'Zen Antique',
		variants: [{ weight: 400, style: 'normal', subset: 'japanese' }],
	},
];

interface CacheEntry {
	digest: string;
	imageId: string;
	imageMtime?: number;
}

// Load the source image from the media path
async function getSourceImage(imageId: string): Promise<sharp.Sharp | undefined> {
	const imagePath = path.join(rootPath, values['media-path'], imageId);

	try {
		await fs.access(imagePath, fs.constants.R_OK);

		return sharp(imagePath);
	} catch {
		return undefined;
	}
}

async function getImageModifiedTime(imageId: string): Promise<number | undefined> {
	const imagePath = path.join(rootPath, values['media-path'], imageId);

	try {
		const stats = await fs.stat(imagePath);

		return stats.mtimeMs;
	} catch {
		return undefined;
	}
}

async function main() {
	console.log(chalk.magenta('=== OpenGraph Image Generator ===\n'));

	if (values['clear-cache']) {
		const outputPath = path.resolve(rootPath, values['output-path']);
		const cacheFile = path.resolve(
			rootPath,
			values['cache-path'],
			`${OPEN_GRAPH_CACHE_NAMESPACE}.json`,
		);
		rmSync(outputPath, { force: true, recursive: true });
		rmSync(cacheFile, { force: true });
		console.log(chalk.yellow(`🗑️  Cleared OG image output and cache file`));
		process.exit(0);
	}

	console.log(chalk.blue('Loading fonts...'));

	const fonts = await loadFonts({ fontConfigs: FONT_CONFIGS });

	console.log(chalk.green(`Loaded ${String(fonts.length)} font variants\n`));

	const generateImage = createGenerator({
		fonts,
		width: OPEN_GRAPH_IMAGE_WIDTH,
		height: OPEN_GRAPH_IMAGE_HEIGHT,
		jpegQuality: 90, // High-quality output because platforms will re-encode
	});

	const { entries, unresolved } = getBuiltEntries({
		dataStorePath: path.resolve(rootPath, values['data-store-path']),
		distPath: path.resolve(rootPath, values['dist-path']),
	});

	if (unresolved.length > 0) {
		console.log(chalk.red(`\n=== Unresolved OG image IDs ===`));

		for (const filename of unresolved) {
			console.log(chalk.red(`✗ ${filename}`));
		}
		console.log(
			chalk.red(
				`\n${String(unresolved.length)} filename(s) referenced by dist could not be resolved to a data-store entry, index page, or archive pattern.`,
			),
		);
		process.exit(1);
	}

	console.log(chalk.blue(`Processing ${String(entries.length)} entries...\n`));

	const outputPath = path.resolve(rootPath, values['output-path']);
	const cachePath = path.resolve(rootPath, values['cache-path']);

	safelyCreateDirectory(outputPath);
	safelyCreateDirectory(cachePath);

	const cache = getFileCacheInstance(cachePath, OPEN_GRAPH_CACHE_NAMESPACE);

	// How many images should be processed concurrently?
	const concurrencyLimit = pLimit(10);

	let generatedCount = 0;
	let skippedCount = 0;
	let errorCount = 0;

	await Promise.all(
		entries.map((entry) =>
			concurrencyLimit(async () => {
				try {
					const outputFilePath = path.join(outputPath, `${entry.id}.${OPEN_GRAPH_IMAGE_FORMAT}`);

					// Resolve image ID: use featured image or fall back based on entry properties
					const imageId = entry.imageFeaturedId;

					// Check cache for existing entry
					const [cached, imageMtime, outputExists] = await Promise.all([
						cache.get<CacheEntry>(entry.id),
						getImageModifiedTime(imageId),
						getFileExists(outputFilePath),
					]);

					// Cache hit: digest matches, same image used, and image hasn't changed
					const digestMatch = cached?.digest === entry.digest;
					const sameImage = cached?.imageId === imageId;
					const imageUnchanged =
						!imageMtime || !cached?.imageMtime || imageMtime <= cached.imageMtime;

					if (digestMatch && sameImage && imageUnchanged && outputExists) {
						skippedCount++;
						return;
					}

					const imageObject = await getSourceImage(imageId);

					if (!imageObject) {
						console.log(
							chalk.red(`✗ Missing image: ${imageId} (used by ${entry.collection}/${entry.id})`),
						);
						errorCount++;
						return;
					}

					const imageBuffer = await generateImage({
						entry: {
							collection: entry.collection,
							id: entry.id,
							title: entry.title,
							titleZh: entry.titleZh,
							titleJa: entry.titleJa,
							titleTh: entry.titleTh,
							isFallback: entry.isFallback,
						},
						imageId,
						imageObject,
					});

					await fs.writeFile(outputFilePath, new Uint8Array(imageBuffer));

					// Update cache
					await cache.set(entry.id, { digest: entry.digest, imageId, imageMtime });

					console.log(chalk.green(`✓ ${entry.collection}/${entry.id}`));
					generatedCount++;
				} catch (error) {
					console.log(chalk.red(`✗ ${entry.collection}/${entry.id}`));
					console.log(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
					errorCount++;
				}
			}),
		),
	);

	console.log(chalk.magenta(`\n=== Summary ===`));
	console.log(chalk.green(`Generated: ${String(generatedCount)} images`));
	if (skippedCount > 0) {
		console.log(chalk.blue(`Skipped: ${String(skippedCount)} (cached)`));
	}
	if (errorCount > 0) {
		console.log(chalk.red(`Errors: ${String(errorCount)}`));
	}
	console.log(chalk.gray(`Output: ${outputPath}`));

	if (errorCount > 0) process.exit(1);
}

await main();
