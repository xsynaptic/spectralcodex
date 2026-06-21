#!/usr/bin/env tsx
import type { CacheStore, FontsourceConfig } from '@xsynaptic/og-image-generator';

import { getFileCacheInstance } from '@spectralcodex/shared/cache/file';
import {
	OPEN_GRAPH_CACHE_NAMESPACE,
	OPEN_GRAPH_IMAGE_FORMAT,
	OPEN_GRAPH_IMAGE_HEIGHT,
	OPEN_GRAPH_IMAGE_WIDTH,
	OPEN_GRAPH_OUTPUT_PATH,
} from '@spectralcodex/shared/constants';
import { createStableCache, fontsourceFonts } from '@xsynaptic/og-image-generator';
import chalk from 'chalk';
import { rmSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';

import { findWorkspaceRoot, safelyCreateDirectory } from '../shared/utils.js';
import { getBuiltEntries } from './content.js';
import { createGenerator } from './generate.js';

const rootPath = findWorkspaceRoot();

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
const OG_TEMPLATE_VERSION = '1';

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

	const fonts = await fontsourceFonts(FONT_CONFIGS, { resolveFrom: import.meta.url });

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

	const keyv = getFileCacheInstance(cachePath, OPEN_GRAPH_CACHE_NAMESPACE);
	const store: CacheStore = {
		get: (id) => keyv.get<string>(id),
		set: async (id, key) => {
			await keyv.set(id, key);
		},
	};
	const cache = createStableCache({
		dir: outputPath,
		extension: OPEN_GRAPH_IMAGE_FORMAT,
		store,
		version: OG_TEMPLATE_VERSION,
	});

	// How many images should be processed concurrently?
	const concurrencyLimit = pLimit(10);

	let generatedCount = 0;
	let skippedCount = 0;
	let errorCount = 0;

	await Promise.all(
		entries.map((entry) =>
			concurrencyLimit(async () => {
				try {
					const imageId = entry.imageFeaturedId;
					const imageMtime = await getImageModifiedTime(imageId);

					// Regenerate when content, source image, or template version changes
					const key = `${entry.digest}:${imageId}:${String(imageMtime ?? '')}`;

					if (await cache.isFresh(entry.id, key)) {
						skippedCount++;
						return;
					}

					const imagePath = await getSourceImagePath(imageId);

					if (!imagePath) {
						console.log(
							chalk.red(`✗ Missing image: ${imageId} (used by ${entry.collection}/${entry.id})`),
						);
						errorCount++;
						return;
					}

					await cache.resolve({
						generate: () =>
							generateImage({
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
								imageInput: imagePath,
							}),
						id: entry.id,
						key,
					});

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
