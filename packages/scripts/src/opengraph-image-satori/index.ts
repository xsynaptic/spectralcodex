#!/usr/bin/env tsx
import { getFileCacheInstance } from '@spectralcodex/utils';
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';
import sharp from 'sharp';

import type { OpenGraphFontConfig, OpenGraphMetadataItem } from './types.js';

import { ContentCollectionsEnum } from '../content-utils/collections.js';
import { getCollection, loadDataStore } from '../content-utils/data-store.js';
import { EntryQualitySchema, ImageFeaturedSchema } from '../content-utils/schemas.js';
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
			default: 'public/og',
		},
		'cache-path': {
			type: 'string',
			default: 'node_modules/.astro/opengraph-satori',
		},
	},
});

/**
 * Open Graph image settings
 * Note: JPG quality is 90 because platforms will re-encode; this gives them better quality source material
 */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_FORMAT = 'jpg';
const CONCURRENCY = 30;

// Testing constraints (hardcoded for development)
const MIN_QUALITY = 1;
const LIMIT = Infinity;
const CACHE_ENABLED = true as boolean;

// Font configuration
const FONT_CONFIGS: Array<OpenGraphFontConfig> = [
	{
		package: 'lora',
		name: 'Lora',
		variants: [
			{ weight: 400, style: 'normal', subset: 'latin' },
			{ weight: 700, style: 'normal', subset: 'latin' },
		],
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

interface ContentEntry extends OpenGraphMetadataItem {
	digest: string;
	entryQuality?: number | undefined;
	imageFeaturedId?: string | undefined;
}

interface CacheEntry {
	digest: string;
	imageMtime?: number;
}

function getImageFeaturedId(
	imageFeatured: ReturnType<typeof ImageFeaturedSchema.parse> | undefined,
): string | undefined {
	if (!imageFeatured) return undefined;

	if (Array.isArray(imageFeatured)) return getImageFeaturedId(imageFeatured[0]);

	return typeof imageFeatured === 'object' && 'id' in imageFeatured
		? imageFeatured.id
		: imageFeatured;
}

function getContentEntries(): Array<ContentEntry> {
	const { collections } = loadDataStore(path.join(values['root-path'], values['data-store-path']));

	const allEntries: Array<ContentEntry> = [];

	for (const collectionName of Object.values(ContentCollectionsEnum)) {
		const collectionEntries = getCollection(collections, collectionName);

		for (const entry of collectionEntries) {
			const imageFeatured = ImageFeaturedSchema.optional().parse(entry.data.imageFeatured);
			const entryQuality = EntryQualitySchema.optional().parse(entry.data.entryQuality);

			const title = entry.data.title as string | undefined;

			if (entryQuality === undefined || entryQuality < MIN_QUALITY) continue;
			if (!title) continue;
			if (!entry.digest) continue;

			allEntries.push({
				collection: collectionName,
				id: entry.id,
				digest: entry.digest,
				title,
				titleZh: entry.data.title_zh as string | undefined,
				titleJa: entry.data.title_ja as string | undefined,
				titleTh: entry.data.title_th as string | undefined,
				entryQuality,
				imageFeaturedId: getImageFeaturedId(imageFeatured),
			});
		}
	}

	allEntries.sort((a, b) => (b.entryQuality ?? 0) - (a.entryQuality ?? 0));

	return allEntries;
}

async function getSourceImage(imageId: string): Promise<sharp.Sharp | undefined> {
	const imagePath = path.join(values['root-path'], values['media-path'], imageId);

	try {
		await fs.access(imagePath, fs.constants.R_OK);
		return sharp(imagePath);
	} catch {
		return undefined;
	}
}

async function getImageMtime(imageId: string): Promise<number | undefined> {
	const imagePath = path.join(values['root-path'], values['media-path'], imageId);

	try {
		const stats = await fs.stat(imagePath);
		return stats.mtimeMs;
	} catch {
		return undefined;
	}
}

async function outputFileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	console.log(chalk.magenta('=== OpenGraph Image Generator (Satori) ===\n'));

	console.log(chalk.blue('Loading fonts...'));
	const fonts = await loadFonts({ fontConfigs: FONT_CONFIGS });
	console.log(chalk.green(`Loaded ${String(fonts.length)} font variants\n`));

	const generateImage = createGenerator({
		fonts,
		width: OG_WIDTH,
		height: OG_HEIGHT,
		density: 2, // Better quality when downscaling
		jpegQuality: 90, // High-quality output because platforms will re-encode
	});

	const entries = getContentEntries();
	const entriesFiltered = entries.slice(0, LIMIT);
	console.log(
		chalk.blue(
			`Processing ${String(entriesFiltered.length)} of ${String(entries.length)} entries...\n`,
		),
	);

	const outputPath = path.join(values['root-path'], values['output-path']);
	const cachePath = path.join(values['root-path'], values['cache-path']);

	await fs.mkdir(outputPath, { recursive: true });
	await fs.mkdir(cachePath, { recursive: true });

	const cache = getFileCacheInstance(cachePath, 'opengraph-satori');

	const concurrencyLimit = pLimit(CONCURRENCY);

	let generatedCount = 0;
	let skippedCount = 0;
	let errorCount = 0;

	await Promise.all(
		entriesFiltered.map((entry) =>
			concurrencyLimit(async () => {
				try {
					const outputFilePath = path.join(outputPath, `${path.basename(entry.id)}.${OG_FORMAT}`);

					// Check cache for existing entry
					const cached = await cache.get<CacheEntry>(entry.id);
					const imageMtime = entry.imageFeaturedId
						? await getImageMtime(entry.imageFeaturedId)
						: undefined;

					// Cache hit: digest matches and image hasn't changed
					const digestMatch = cached?.digest === entry.digest;
					const imageUnchanged =
						!imageMtime || !cached?.imageMtime || imageMtime <= cached.imageMtime;
					const fileExists = await outputFileExists(outputFilePath);

					if (digestMatch && imageUnchanged && fileExists && CACHE_ENABLED) {
						skippedCount++;
						return;
					}

					// Generate image
					const imageObject = entry.imageFeaturedId
						? await getSourceImage(entry.imageFeaturedId)
						: undefined;

					const metadata: OpenGraphMetadataItem = {
						collection: entry.collection,
						id: entry.id,
						title: entry.title,
						titleZh: entry.titleZh,
						titleJa: entry.titleJa,
						titleTh: entry.titleTh,
					};

					const imageBuffer = await generateImage(metadata, imageObject);

					await fs.writeFile(outputFilePath, new Uint8Array(imageBuffer));

					// Update cache
					await cache.set(entry.id, { digest: entry.digest, imageMtime });

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
