#!/usr/bin/env tsx
import { openGraphOutputPath, openGraphStatePath } from '@spectralcodex/shared/open-graph';
import { createSourceFingerprints } from '@spectralcodex/shared/source-fingerprint';
import chalk from 'chalk';
import { rmSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';

import type { ImageBatch } from '#og-image/batch.ts';
import type { OpenGraphContentEntry } from '#og-image/types.ts';

import { batchEntriesBySourceImage } from '#og-image/batch.ts';
import { getBuiltEntries } from '#og-image/built-entries.ts';
import { loadOpenGraphFonts } from '#og-image/fonts.ts';
import { createRenderer, processImage } from '#og-image/generate.ts';
import { createOutputCache, getOutputCacheKey } from '#og-image/output-cache.ts';
import { Refusal } from '#shared/cli-error.ts';
import { findWorkspaceRoot, getLocalCachePath, safelyCreateDirectory } from '#shared/utils.ts';

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'allow-mass-prune': {
			default: false,
			type: 'boolean',
		},
		'clear-cache': {
			default: false,
			type: 'boolean',
		},
		'dist-path': {
			default: './dist',
			type: 'string',
		},
		'media-path': {
			default: 'packages/content/media',
			type: 'string',
		},
		'output-path': {
			default: openGraphOutputPath,
			type: 'string',
		},
		'state-path': {
			default: openGraphStatePath,
			type: 'string',
		},
	},
});

function exitOnUnresolvedEntries(unresolved: Array<string>) {
	if (unresolved.length === 0) return;

	console.log(chalk.red(`\n=== Unresolved OG image IDs ===`));

	for (const filename of unresolved) {
		console.log(chalk.red(`✗ ${filename}`));
	}
	console.log(
		chalk.red(
			`\n${String(unresolved.length)} filename(s) referenced by dist could not be resolved to a content entry, index page, or chronology pattern.`,
		),
	);
	process.exit(1);
}

const fingerprints = createSourceFingerprints(getLocalCachePath(rootPath));

async function getImageDigest(imageId: string) {
	const fingerprint = await fingerprints.get(path.join(rootPath, values['media-path'], imageId));

	return fingerprint?.sha256;
}

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

async function loadRenderer() {
	console.log(chalk.blue('Loading fonts...'));

	const fonts = await loadOpenGraphFonts();

	console.log(chalk.green(`Loaded ${String(fonts.length)} font variants\n`));

	return createRenderer({ fonts });
}

function logSummary(counts: {
	errors: number;
	generated: number;
	pruned: number;
	skipped: number;
}) {
	console.log(chalk.magenta(`\n=== Summary ===`));
	console.log(chalk.green(`Generated: ${String(counts.generated)} images`));
	if (counts.skipped > 0) {
		console.log(chalk.blue(`Skipped: ${String(counts.skipped)} (cached)`));
	}
	if (counts.pruned > 0) {
		console.log(chalk.yellow(`Pruned: ${String(counts.pruned)} orphaned images`));
	}
	if (counts.errors > 0) {
		console.log(chalk.red(`Errors: ${String(counts.errors)}`));
	}
}

async function main() {
	console.log(chalk.magenta('=== OpenGraph Image Generator ===\n'));

	const outputPath = path.resolve(rootPath, values['output-path']);

	if (values['clear-cache']) {
		rmSync(outputPath, { force: true, recursive: true });
		console.log(chalk.yellow(`🗑️  Cleared OG image output\n`));
	}

	const renderCard = await loadRenderer();

	const { entries, unresolved } = await getBuiltEntries({
		distPath: path.resolve(rootPath, values['dist-path']),
	});

	exitOnUnresolvedEntries(unresolved);

	console.log(chalk.blue(`Processing ${String(entries.length)} entries...\n`));

	safelyCreateDirectory(outputPath);

	const outputCache = await createOutputCache({
		directory: outputPath,
		statePath: path.resolve(rootPath, values['state-path']),
	});
	const prune = await outputCache.planPrune(new Set(entries.map((entry) => entry.id)), {
		isMassPruneAllowed: values['allow-mass-prune'],
	});

	// Decoding is bounded by memory (a 3 MB buffer per slot), rendering by CPU
	const decodeLimit = pLimit(10);
	const renderLimit = pLimit(16);

	const counts = { errors: 0, generated: 0, skipped: 0 };

	async function selectStaleEntries(batch: ImageBatch) {
		const imageDigest = await getImageDigest(batch.imageId);
		const stale: Array<{ entry: OpenGraphContentEntry; key: string }> = [];

		for (const entry of batch.entries) {
			const key = getOutputCacheKey({
				digest: entry.digest,
				imageDigest,
				imageId: batch.imageId,
			});

			if (outputCache.isFresh(entry.id, key)) {
				counts.skipped++;
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
				counts.errors++;
			}
			return;
		}

		const image = await processImage({ imageInput: imagePath, isFallback: batch.isFallback });

		await Promise.all(
			stale.map(({ entry, key }) =>
				renderLimit(async () => {
					try {
						await outputCache.write(entry.id, key, await renderCard(entry, image));

						console.log(chalk.green(`✓ ${entry.collection}/${entry.id}`));
						counts.generated++;
					} catch (error) {
						console.log(chalk.red(`✗ ${entry.collection}/${entry.id}`));
						console.log(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
						counts.errors++;
					}
				}),
			),
		);
	}

	const batches = batchEntriesBySourceImage(entries);

	console.log(chalk.blue(`Batched into ${String(batches.length)} source images\n`));

	await Promise.all(batches.map((batch) => decodeLimit(() => renderBatch(batch))));

	await prune.apply();
	await outputCache.save();

	logSummary({ ...counts, pruned: prune.orphans.length });
	console.log(chalk.gray(`Output: ${outputPath}`));

	if (counts.errors > 0) process.exit(1);
}

try {
	await main();
} catch (error) {
	if (!(error instanceof Refusal)) throw error;

	console.log(chalk.red(error.message));
	process.exitCode = 1;
}
