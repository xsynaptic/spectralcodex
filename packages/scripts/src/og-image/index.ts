import { getCachePaths } from '@spectralcodex/shared/paths';
import { createSourceFingerprints } from '@xsynaptic/astro-image-pipeline/fingerprints';
import { rmSync } from 'node:fs';
import path from 'node:path';
import pLimit from 'p-limit';

import type { ImageBatch } from '#og-image/batch.ts';
import type { OpenGraphContentEntry } from '#og-image/types.ts';
import type { ScriptPaths } from '#shared/cli-command.ts';

import { batchEntriesBySourceImage } from '#og-image/batch.ts';
import { getBuiltEntries } from '#og-image/built-entries.ts';
import { loadOpenGraphFonts } from '#og-image/fonts.ts';
import { createRenderer, processImage } from '#og-image/generate.ts';
import { createOutputCache, getOutputCacheKey } from '#og-image/output-cache.ts';
import { defineCommand, Refusal, runCommand } from '#shared/cli-command.ts';
import { formatCount, formatError, log } from '#shared/cli-output.ts';
import { createProgress, withSpinner } from '#shared/cli-progress.ts';
import { isExistingFile, safelyCreateDirectory } from '#shared/files.ts';

function assertResolvedEntries(unresolved: Array<string>) {
	if (unresolved.length === 0) return;

	for (const filename of unresolved) log.error(`Unresolved OG image ID: ${filename}`);

	throw new Refusal(
		`${formatCount(unresolved.length)} filename(s) referenced by dist could not be resolved to a content entry, index page, or chronology pattern`,
	);
}

async function prepareCards({
	isClearCache,
	isMassPruneAllowed,
	paths,
}: {
	isClearCache: boolean;
	isMassPruneAllowed: boolean;
	paths: ScriptPaths;
}) {
	const { openGraphPath: outputPath, openGraphStatePath } = getCachePaths(paths.cachePath);

	if (isClearCache) {
		rmSync(outputPath, { force: true, recursive: true });
		log.warn('Cleared OG image output');
	}

	const fonts = await withSpinner(
		'Loading fonts',
		loadOpenGraphFonts,
		(loaded) => `Loaded ${String(loaded.length)} font variants`,
	);

	const { entries, unresolved } = await withSpinner('Reading built pages', () =>
		getBuiltEntries({ distPath: paths.distPath }),
	);

	assertResolvedEntries(unresolved);

	safelyCreateDirectory(outputPath);

	const outputCache = await createOutputCache({
		directory: outputPath,
		statePath: openGraphStatePath,
	});
	const prune = await outputCache.planPrune(new Set(entries.map((entry) => entry.id)), {
		isMassPruneAllowed,
	});

	return { entries, outputCache, outputPath, prune, renderCard: createRenderer({ fonts }) };
}

async function generateCards({
	paths,
	signal,
	...options
}: {
	isClearCache: boolean;
	isMassPruneAllowed: boolean;
	paths: ScriptPaths;
	signal: AbortSignal;
}) {
	const { entries, outputCache, outputPath, prune, renderCard } = await prepareCards({
		...options,
		paths,
	});
	const fingerprints = createSourceFingerprints(paths.cachePath);

	// Decoding is bounded by memory (a 3 MB buffer per slot), rendering by CPU
	const decodeLimit = pLimit(10);
	const renderLimit = pLimit(16);

	const counts = { errors: 0, generated: 0, skipped: 0 };
	const progress = createProgress({
		label: 'Rendering',
		note: () => `${formatCount(counts.generated)} rendered, ${formatCount(counts.skipped)} cached`,
		total: entries.length,
	});

	async function selectStaleEntries(batch: ImageBatch) {
		const fingerprint = await fingerprints.get(path.join(paths.mediaPath, batch.imageId));
		const imageDigest = fingerprint?.sha256;
		const stale: Array<{ entry: OpenGraphContentEntry; key: string }> = [];

		for (const entry of batch.entries) {
			const key = getOutputCacheKey({
				digest: entry.digest,
				imageDigest,
				imageId: batch.imageId,
			});

			if (outputCache.isFresh(entry.id, key)) {
				counts.skipped++;
				progress.tick();
				continue;
			}

			stale.push({ entry, key });
		}

		return stale;
	}

	async function renderBatch(batch: ImageBatch) {
		if (signal.aborted) return;

		const stale = await selectStaleEntries(batch);

		// Nothing to draw, so the source image is never decoded
		if (stale.length === 0) return;

		const imagePath = path.join(paths.mediaPath, batch.imageId);

		if (!(await isExistingFile(imagePath))) {
			for (const { entry } of stale) {
				log.error(`Missing image: ${batch.imageId} (used by ${entry.collection}/${entry.id})`);
				counts.errors++;
				progress.tick();
			}
			return;
		}

		const image = await processImage({ imageInput: imagePath, isFallback: batch.isFallback });

		await Promise.all(
			stale.map(({ entry, key }) =>
				renderLimit(async () => {
					try {
						await outputCache.write(entry.id, key, await renderCard(entry, image));
						counts.generated++;
					} catch (error) {
						log.error(`${entry.collection}/${entry.id}: ${formatError(error)}`);
						counts.errors++;
					}

					progress.tick();
				}),
			),
		);
	}

	const batches = batchEntriesBySourceImage(entries);

	await Promise.all(batches.map((batch) => decodeLimit(() => renderBatch(batch))));

	if (signal.aborted) {
		await outputCache.save();
		signal.throwIfAborted();
	}

	await prune.apply();
	await outputCache.save();

	if (counts.errors > 0) {
		progress.warn();
	} else {
		progress.succeed();
	}

	log.summary([
		['Entries', entries.length],
		['Source images', batches.length],
		['Rendered', counts.generated],
		['Cached', counts.skipped],
		['Pruned', prune.orphans.length],
		['Errors', counts.errors],
	]);
	log.detail(`Output: ${outputPath}`);

	if (counts.errors > 0) throw new Refusal(`${formatCount(counts.errors)} card(s) failed`);
}

await runCommand(
	defineCommand({
		interrupted: 'finished cards are saved and the next run resumes',
		name: 'og-image',
		options: {
			'allow-mass-prune': {
				default: false,
				description: 'Prune more cards than the safety limit allows',
				type: 'boolean',
			},
			'clear-cache': {
				default: false,
				description: 'Delete every card and render from scratch',
				type: 'boolean',
			},
		},
		async run({ paths, signal, values }) {
			await generateCards({
				isClearCache: values['clear-cache'],
				isMassPruneAllowed: values['allow-mass-prune'],
				paths,
				signal,
			});
		},
		summary: 'Render an OpenGraph card for every page in dist, incrementally',
		title: 'OpenGraph images',
	}),
);
