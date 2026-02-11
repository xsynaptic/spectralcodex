#!/usr/bin/env tsx
import { getFileCacheInstance } from '@spectralcodex/shared/cache/file';
import {
	OPEN_GRAPH_IMAGE_FORMAT,
	OPEN_GRAPH_IMAGE_HEIGHT,
	OPEN_GRAPH_IMAGE_WIDTH,
} from '@spectralcodex/shared/constants';
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';
import { getContentEntries } from 'packages/scripts/src/og-image/content.js';
import sharp from 'sharp';

import type { OpenGraphFontConfig } from './types.js';

import { safelyCreateDirectory } from '../shared/utils.js';
import { loadFonts } from './fonts.js';
import { createGenerator } from './generate.js';

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
		'media-path': {
			type: 'string',
			default: 'packages/content/media',
		},
		'output-path': {
			type: 'string',
			default: './.cache/og-image',
		},
		'cache-path': {
			type: 'string',
			default: './.cache',
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
	const imagePath = path.join(values['root-path'], values['media-path'], imageId);

	try {
		await fs.access(imagePath, fs.constants.R_OK);

		return sharp(imagePath);
	} catch {
		return undefined;
	}
}

async function getImageModifiedTime(imageId: string): Promise<number | undefined> {
	const imagePath = path.join(values['root-path'], values['media-path'], imageId);

	try {
		const stats = await fs.stat(imagePath);

		return stats.mtimeMs;
	} catch {
		return undefined;
	}
}

async function main() {
	console.log(chalk.magenta('=== OpenGraph Image Generator (Satori) ===\n'));

	console.log(chalk.blue('Loading fonts...'));

	const fonts = await loadFonts({ fontConfigs: FONT_CONFIGS });

	console.log(chalk.green(`Loaded ${String(fonts.length)} font variants\n`));

	const generateImage = createGenerator({
		fonts,
		width: OPEN_GRAPH_IMAGE_WIDTH,
		height: OPEN_GRAPH_IMAGE_HEIGHT,
		jpegQuality: 90, // High-quality output because platforms will re-encode
	});

	const entries = getContentEntries(path.join(values['root-path'], values['data-store-path']));

	console.log(chalk.blue(`Processing ${String(entries.length)} entries...\n`));

	const outputPath = path.join(values['root-path'], values['output-path']);
	const cachePath = path.join(values['root-path'], values['cache-path']);

	safelyCreateDirectory(outputPath);
	safelyCreateDirectory(cachePath);

	const cache = getFileCacheInstance(cachePath, 'og-image-cache');

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
						fs.stat(outputFilePath).then(
							() => true,
							() => false,
						),
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
							chalk.yellow(`⚠ Missing image: ${imageId} (used by ${entry.collection}/${entry.id})`),
						);
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
}

await main();
