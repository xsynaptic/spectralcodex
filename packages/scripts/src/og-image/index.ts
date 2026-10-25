import type { DerivativeJob, SourceFingerprints } from '@xsynaptic/astro-image-pipeline/node';

import { getCachePaths } from '@spectralcodex/shared/paths';
import { createSourceFingerprints, runDerivatives } from '@xsynaptic/astro-image-pipeline/node';
import { rmSync } from 'node:fs';
import path from 'node:path';

import type { ImageBatch } from '#og-image/batch.ts';
import type { ProcessedImage } from '#og-image/generate.ts';
import type { ScriptPaths } from '#shared/cli-command.ts';

import { batchEntriesBySourceImage } from '#og-image/batch.ts';
import { getBuiltEntries } from '#og-image/built-entries.ts';
import { loadOpenGraphFonts } from '#og-image/fonts.ts';
import { createRenderer, processImage } from '#og-image/generate.ts';
import { getCardName, getOutputCacheKey } from '#og-image/output-cache.ts';
import { defineCommand, Refusal, runCommand } from '#shared/cli-command.ts';
import { formatCount, log } from '#shared/cli-output.ts';
import { createProgress, withSpinner } from '#shared/cli-progress.ts';
import { isExistingFile } from '#shared/files.ts';

function assertResolvedEntries(unresolved: Array<string>) {
	if (unresolved.length === 0) return;

	for (const filename of unresolved) log.error(`Unresolved OG image ID: ${filename}`);

	throw new Refusal(
		`${formatCount(unresolved.length)} filename(s) referenced by dist could not be resolved to a content entry, index page, or chronology pattern`,
	);
}

async function prepareCards({
	isClearCache,
	paths,
}: {
	isClearCache: boolean;
	paths: ScriptPaths;
}) {
	const { openGraphPath: outputPath, openGraphStatePath: statePath } = getCachePaths(
		paths.cachePath,
	);

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

	return { entries, outputPath, renderCard: createRenderer({ fonts }), statePath };
}

async function decodeBatchImage(batch: ImageBatch, mediaPath: string) {
	const imagePath = path.join(mediaPath, batch.imageId);

	if (!(await isExistingFile(imagePath))) throw new Error(`Missing image: ${batch.imageId}`);

	return processImage({ imageInput: imagePath, isFallback: batch.isFallback });
}

function createBatchDecoder(mediaPath: string) {
	let current: undefined | { batch: ImageBatch; image: Promise<ProcessedImage> };

	return function getBatchImage(batch: ImageBatch) {
		if (current?.batch !== batch) current = { batch, image: decodeBatchImage(batch, mediaPath) };

		return current.image;
	};
}

async function createCardJobs({
	batches,
	fingerprints,
	mediaPath,
	renderCard,
}: {
	batches: ReadonlyArray<ImageBatch>;
	fingerprints: SourceFingerprints;
	mediaPath: string;
	renderCard: ReturnType<typeof createRenderer>;
}) {
	const getBatchImage = createBatchDecoder(mediaPath);
	const jobs: Array<DerivativeJob> = [];

	for (const batch of batches) {
		const fingerprint = await fingerprints.get(path.join(mediaPath, batch.imageId));

		for (const entry of batch.entries) {
			jobs.push({
				key: getOutputCacheKey({
					digest: entry.digest,
					imageDigest: fingerprint?.sha256,
					imageId: batch.imageId,
				}),
				name: getCardName(entry.id),
				render: async () => renderCard(entry, await getBatchImage(batch)),
			});
		}
	}

	return jobs;
}

async function generateCards({
	isClearCache,
	paths,
	signal,
}: {
	isClearCache: boolean;
	paths: ScriptPaths;
	signal: AbortSignal;
}) {
	const { entries, outputPath, renderCard, statePath } = await prepareCards({
		isClearCache,
		paths,
	});
	const batches = batchEntriesBySourceImage(entries);
	const jobs = await createCardJobs({
		batches,
		fingerprints: createSourceFingerprints(paths.cachePath),
		mediaPath: paths.mediaPath,
		renderCard,
	});
	let latest = { fresh: 0, rendered: 0 };
	const progress = createProgress({
		label: 'Rendering',
		note: () => `${formatCount(latest.rendered)} rendered, ${formatCount(latest.fresh)} cached`,
		total: jobs.length,
	});
	const counts = await runDerivatives({
		directory: outputPath,
		jobs,
		onFailure: 'report',
		onProgress(update) {
			latest = update;
			progress.tick();
		},
		signal,
		statePath,
	});

	for (const { message, name } of counts.failures) log.error(`${name}: ${message}`);

	if (counts.failures.length > 0) {
		progress.warn();
	} else {
		progress.succeed();
	}

	log.summary([
		['Entries', entries.length],
		['Source images', batches.length],
		['Rendered', counts.rendered],
		['Cached', counts.fresh],
		['Written', counts.written],
		['Errors', counts.failures.length],
	]);
	log.detail(`Output: ${outputPath}`);

	if (counts.failures.length > 0) {
		throw new Refusal(`${formatCount(counts.failures.length)} card(s) failed`);
	}
}

await runCommand(
	defineCommand({
		interrupted: 'finished cards are saved and the next run resumes',
		name: 'og-image',
		options: {
			'clear-cache': {
				default: false,
				description: 'Delete every card and render from scratch',
				type: 'boolean',
			},
		},
		async run({ paths, signal, values }) {
			await generateCards({
				isClearCache: values['clear-cache'],
				paths,
				signal,
			});
		},
		summary: 'Render an OpenGraph card for every page in dist, incrementally',
		title: 'OpenGraph images',
	}),
);
