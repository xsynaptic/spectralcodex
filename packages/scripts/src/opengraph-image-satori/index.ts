#!/usr/bin/env tsx
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
	},
});

// OG image settings
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_DENSITY = 2;
const OG_FORMAT = 'jpg';
const OG_QUALITY = 80;
const CONCURRENCY = 10;

// Testing constraints (hardcoded for development)
const MIN_QUALITY = 4;
const LIMIT = 10;

// Font configuration
const FONT_CONFIGS: Array<OpenGraphFontConfig> = [
	{
		package: 'geologica',
		name: 'Geologica',
		variants: [{ weight: 700, style: 'normal', subset: 'latin' }],
	},
	{
		package: 'noto-sans-tc',
		name: 'Noto Sans TC',
		variants: [{ weight: 500, style: 'normal', subset: 'chinese-traditional' }],
	},
];

interface ContentEntry {
	collection: string;
	id: string;
	title: string;
	subtitle?: string | undefined;
	entryQuality?: number | undefined;
	imageFeaturedId?: string | undefined;
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

			// Note: currently this package only supports Chinese subtitles because of font limitations
			const subtitle = entry.data.title_zh as string | undefined;

			if (entryQuality === undefined || entryQuality < MIN_QUALITY) continue;
			if (!title) continue;

			allEntries.push({
				collection: collectionName,
				id: entry.id,
				title,
				subtitle,
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

async function main() {
	console.log(chalk.magenta('=== OpenGraph Image Generator (Satori) ===\n'));

	console.log(chalk.blue('Loading fonts...'));
	const fonts = await loadFonts({ fontConfigs: FONT_CONFIGS });
	console.log(chalk.green(`Loaded ${String(fonts.length)} font variants\n`));

	const generateImage = createGenerator({
		fonts,
		width: OG_WIDTH,
		height: OG_HEIGHT,
		density: OG_DENSITY,
		jpegQuality: OG_QUALITY,
	});

	const entries = getContentEntries();
	const entriesFiltered = entries.slice(0, LIMIT);
	console.log(
		chalk.blue(
			`Processing ${String(entriesFiltered.length)} of ${String(entries.length)} entries...\n`,
		),
	);

	const outputPath = path.join(values['root-path'], values['output-path']);

	await fs.mkdir(outputPath, { recursive: true });

	const concurrencyLimit = pLimit(CONCURRENCY);
	let successCount = 0;
	let errorCount = 0;

	await Promise.all(
		entriesFiltered.map((entry) =>
			concurrencyLimit(async () => {
				try {
					const imageObject = entry.imageFeaturedId
						? await getSourceImage(entry.imageFeaturedId)
						: undefined;

					const metadata: OpenGraphMetadataItem = {
						collection: entry.collection,
						id: entry.id,
						title: entry.title,
						subtitle: entry.subtitle,
					};

					const imageBuffer = await generateImage(metadata, imageObject);
					const outputFilePath = path.join(outputPath, `${path.basename(entry.id)}.${OG_FORMAT}`);

					await fs.writeFile(outputFilePath, new Uint8Array(imageBuffer));

					console.log(chalk.green(`✓ ${entry.collection}/${entry.id}`));
					successCount++;
				} catch (error) {
					console.log(chalk.red(`✗ ${entry.collection}/${entry.id}`));
					console.log(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
					errorCount++;
				}
			}),
		),
	);

	console.log(chalk.magenta(`\n=== Summary ===`));
	console.log(chalk.green(`Generated: ${String(successCount)} images`));
	if (errorCount > 0) {
		console.log(chalk.red(`Errors: ${String(errorCount)}`));
	}
	console.log(chalk.gray(`Output: ${outputPath}`));
}

await main();
