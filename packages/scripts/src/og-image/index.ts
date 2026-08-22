#!/usr/bin/env tsx
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

import type { ImageBatch } from './batch.js';
import type { FontsourceConfig } from './fonts.js';
import type { OutputCacheStore } from './output-cache.js';
import type { OpenGraphContentEntry } from './types.js';

import { getFileCacheInstance } from '../shared/cache-file.js';
import { DATA_STORE_PATH } from '../shared/data-store.js';
import { findWorkspaceRoot, safelyCreateDirectory } from '../shared/utils.js';
import { batchEntriesBySourceImage, getOutputCacheKey } from './batch.js';
import { getBuiltEntries } from './content.js';
import { fontsourceFonts } from './fonts.js';
import { createRenderer, processImage } from './generate.js';
import { createOutputCache } from './output-cache.js';

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
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
const FONT_CONFIGS: Array<FontsourceConfig> = [
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

// Bump when the OG template (element.tsx) changes, to regenerate every card.
const OG_TEMPLATE_VERSION = '2';

// Resolve the readable source image path from the media path
async function getSourceImagePath(imageId: string): Promise<string | undefined> {
	const imagePath = path.join(rootPath, values['media-path'], imageId);

	try {
		await fs.access(imagePath, fs.constants.R_OK);

		return imagePath;
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

	const fonts = await fontsourceFonts(FONT_CONFIGS);

	console.log(chalk.green(`Loaded ${String(fonts.length)} font variants\n`));

	const renderCard = createRenderer({
		fonts,
		width: OPEN_GRAPH_IMAGE_WIDTH,
		height: OPEN_GRAPH_IMAGE_HEIGHT,
		jpegQuality: 90, // High-quality output because platforms will re-encode
	});

	const { entries, unresolved } = getBuiltEntries({
		dataStorePath: path.resolve(rootPath, DATA_STORE_PATH),
		distPath: path.resolve(rootPath, values['dist-path']),
	});

	if (unresolved.length > 0) {
		console.log(chalk.red(`\n=== Unresolved OG image IDs ===`));

		for (const filename of unresolved) {
			console.log(chalk.red(`✗ ${filename}`));
		}
		console.log(
			chalk.red(
				`\n${String(unresolved.length)} filename(s) referenced by dist could not be resolved to a data-store entry, index page, or chronology pattern.`,
			),
		);
		process.exit(1);
	}

	console.log(chalk.blue(`Processing ${String(entries.length)} entries...\n`));

	const outputPath = path.resolve(rootPath, values['output-path']);
	const cachePath = path.resolve(rootPath, values['cache-path']);

	safelyCreateDirectory(outputPath);
	safelyCreateDirectory(cachePath);

	const keyv = getFileCacheInstance(cachePath, OPEN_GRAPH_CACHE_NAMESPACE);
	const store: OutputCacheStore = {
		get: (id) => keyv.get<string>(id),
		set: async (id, key) => {
			await keyv.set(id, key);
		},
	};
	const outputCache = createOutputCache({
		dir: outputPath,
		extension: OPEN_GRAPH_IMAGE_FORMAT,
		store,
		version: OG_TEMPLATE_VERSION,
	});

	// Decoding is bounded by memory (a 3 MB buffer per slot), rendering by CPU
	const decodeLimit = pLimit(10);
	const renderLimit = pLimit(16);

	let generatedCount = 0;
	let skippedCount = 0;
	let errorCount = 0;

	async function selectStaleEntries(batch: ImageBatch) {
		const imageModifiedTime = await getImageModifiedTime(batch.imageId);
		const stale: Array<{ entry: OpenGraphContentEntry; key: string }> = [];

		for (const entry of batch.entries) {
			const key = getOutputCacheKey({
				digest: entry.digest,
				imageId: batch.imageId,
				imageModifiedTime,
			});

			if (await outputCache.isFresh(entry.id, key)) {
				skippedCount++;
				continue;
			}

			stale.push({ entry, key });
		}

		return stale;
	}

	async function renderBatch(batch: ImageBatch) {
		const stale = await selectStaleEntries(batch);

		// Nothing to draw, so the source image is never decoded
		if (stale.length === 0) return;

		const imagePath = await getSourceImagePath(batch.imageId);

		if (!imagePath) {
			for (const { entry } of stale) {
				console.log(
					chalk.red(`✗ Missing image: ${batch.imageId} (used by ${entry.collection}/${entry.id})`),
				);
				errorCount++;
			}
			return;
		}

		const image = await processImage({
			imageInput: imagePath,
			height: OPEN_GRAPH_IMAGE_HEIGHT,
			width: OPEN_GRAPH_IMAGE_WIDTH,
			isFallback: batch.isFallback,
		});

		await Promise.all(
			stale.map(({ entry, key }) =>
				renderLimit(async () => {
					try {
						await outputCache.write(entry.id, key, await renderCard(entry, image));

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
	}

	const batches = batchEntriesBySourceImage(entries);

	console.log(chalk.blue(`Batched into ${String(batches.length)} source images\n`));

	await Promise.all(batches.map((batch) => decodeLimit(() => renderBatch(batch))));

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
