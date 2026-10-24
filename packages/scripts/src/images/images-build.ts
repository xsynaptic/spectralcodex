import type { ImageDerivative, ImageManifest } from '@spectralcodex/shared/images';
import type { SourceFingerprints } from '@spectralcodex/shared/source-fingerprint';
import type { OutputInfo } from 'sharp';

import { imageBuildIdFile, imageQualityByFormat } from '@spectralcodex/shared/images';
import { createHash } from 'node:crypto';
import path from 'node:path';
import pLimit from 'p-limit';
import sharp from 'sharp';

import { imageRenderRevision, renderImage } from '#images/images-render.ts';
import {
	engineId,
	readEngine,
	readGraceManifest,
	readManifest,
	recordConsumedManifest,
	writeEngine,
} from '#images/images-state.ts';
import { Refusal } from '#shared/cli-command.ts';
import { createFileCache } from '#shared/file-cache.ts';
import { createPurgeQueue } from '#shared/purge-queue.ts';
import { readFileIfExists } from '#shared/utils.ts';

// Measured fastest on the Mac: 10 single-threaded jobs, which needs UV_THREADPOOL_SIZE=10
const jobCount = 10;

const saveInterval = 10_000;

export interface ImageBuildOptions {
	derivativesPath: string;
	distPath: string;
	fingerprints: SourceFingerprints;
	isMassPruneAllowed?: boolean;
	mediaPath: string;
	onProgress?: (progress: { done: number; total: number }) => void;
	signal?: AbortSignal;
	statePath: string;
}

type ImageCache = Awaited<ReturnType<typeof createFileCache>>;

interface ImageCounts {
	encoded: number;
	fresh: number;
	overwritten: number;
	written: number;
}

function formatList(items: ReadonlyArray<string>) {
	return items
		.slice(0, 10)
		.map((item) => `  ${item}`)
		.join('\n');
}

function getDerivativeKey(derivative: ImageDerivative, sourceDigest: string) {
	return createHash('sha256')
		.update(
			[
				sourceDigest,
				derivative.format,
				imageQualityByFormat[derivative.format],
				derivative.width,
				derivative.height ?? '',
				imageRenderRevision,
				engineId,
			].join(':'),
		)
		.digest('hex')
		.slice(0, 16);
}

async function readCurrentManifest({ distPath, mediaPath, statePath }: ImageBuildOptions) {
	const manifest = await readManifest(statePath);

	if (!manifest) throw new Refusal(`No image manifest in ${statePath}; build first`);

	const distBuildIdData = await readFileIfExists(path.join(distPath, imageBuildIdFile));
	const distBuildId = distBuildIdData?.toString('utf8').trim();

	if (distBuildId !== manifest.buildId) {
		throw new Refusal(
			`Manifest build ${manifest.buildId} does not match ${distPath} (${distBuildId ?? 'no build id'}); rebuild first`,
		);
	}

	if (manifest.mediaPath !== mediaPath) {
		throw new Refusal(
			`Manifest was built from ${manifest.mediaPath}, not the configured ${mediaPath}`,
		);
	}

	return manifest;
}

// Names depend only on source dimensions, so an edit at the same size needs no rebuild
async function readSourceDigests(
	fingerprints: SourceFingerprints,
	mediaPath: string,
	manifest: ImageManifest,
) {
	const limit = pLimit(jobCount);
	const digests = new Map<string, string>();
	const drifted: Array<string> = [];

	await Promise.all(
		Object.entries(manifest.sources).map(([id, source]) =>
			limit(async () => {
				const fingerprint = await fingerprints.get(path.join(mediaPath, id));

				if (fingerprint?.width !== source.width || fingerprint.height !== source.height) {
					drifted.push(id);
					return;
				}

				digests.set(id, fingerprint.sha256);
			}),
		),
	);

	if (drifted.length > 0) {
		const sorted = drifted.toSorted((first, second) => first.localeCompare(second));

		throw new Refusal(
			`${String(drifted.length)} sources changed size or vanished since the build; rebuild first:\n${formatList(sorted)}`,
		);
	}

	return digests;
}

async function planPrune(
	cache: ImageCache,
	manifest: ImageManifest,
	{ isMassPruneAllowed = false, statePath }: ImageBuildOptions,
) {
	const graceManifest = await readGraceManifest(statePath, manifest);
	const keep = new Set(
		[...manifest.derivatives, ...(graceManifest?.derivatives ?? [])].map(
			(derivative) => derivative.path,
		),
	);

	return cache.planPrune(keep, { isMassPruneAllowed });
}

function assertEncodedSize(derivative: ImageDerivative, info: OutputInfo) {
	if (info.width === derivative.width && (derivative.height ?? info.height) === info.height) return;

	throw new Error(`encoded ${String(info.width)}x${String(info.height)}`);
}

function createDerivativeProcessor({
	cache,
	counts,
	digests,
	mediaPath,
}: {
	cache: ImageCache;
	counts: ImageCounts;
	digests: Map<string, string>;
	mediaPath: string;
}) {
	return async function processDerivative(derivative: ImageDerivative) {
		const digest = digests.get(derivative.id);

		if (!digest) throw new Error(`source ${derivative.id} missing from the manifest`);

		const key = getDerivativeKey(derivative, digest);

		if (cache.isFresh(derivative.path, key)) {
			counts.fresh++;
			return;
		}

		const { data, info } = await renderImage(path.join(mediaPath, derivative.id), {
			format: derivative.format,
			height: derivative.height,
			quality: imageQualityByFormat[derivative.format],
			width: derivative.width,
		});

		counts.encoded++;
		assertEncodedSize(derivative, info);

		if (await cache.write(derivative.path, key, data)) counts.written++;
	};
}

// Each job checks the signal before starting, so an interrupt lets the encodes in flight land
async function runJobs(
	derivatives: ReadonlyArray<ImageDerivative>,
	processDerivative: (derivative: ImageDerivative) => Promise<void>,
	{
		onProgress,
		save,
		signal,
	}: Pick<ImageBuildOptions, 'onProgress' | 'signal'> & { save: () => Promise<void> },
) {
	const limit = pLimit(jobCount);
	const failures: Array<string> = [];
	let done = 0;
	let lastSave = Date.now();

	await Promise.all(
		derivatives.map((derivative) =>
			limit(async () => {
				if (signal?.aborted) return;

				try {
					await processDerivative(derivative);
				} catch (error) {
					failures.push(
						`${derivative.path}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}

				done++;
				onProgress?.({ done, total: derivatives.length });

				if (Date.now() - lastSave < saveInterval) return;

				lastSave = Date.now();
				await save();
			}),
		),
	);

	return failures;
}

export async function buildImages(options: ImageBuildOptions) {
	const { derivativesPath, fingerprints, mediaPath, signal, statePath } = options;
	const manifest = await readCurrentManifest(options);
	const engine = await readEngine(statePath);
	const purgeQueue = await createPurgeQueue(statePath);
	const counts: ImageCounts = { encoded: 0, fresh: 0, overwritten: 0, written: 0 };
	const cache = await createFileCache({
		directory: derivativesPath,
		extensions: Object.keys(imageQualityByFormat),
		onReplace: async (name) => {
			counts.overwritten++;
			await purgeQueue.add(name);
		},
		statePath,
	});
	const prune = await planPrune(cache, manifest, options);
	const digests = await readSourceDigests(fingerprints, mediaPath, manifest);

	sharp.concurrency(1);
	sharp.cache(false);

	const saveLimit = pLimit(1);
	const save = () => saveLimit(() => cache.save());
	const failures = await runJobs(
		manifest.derivatives,
		createDerivativeProcessor({ cache, counts, digests, mediaPath }),
		{ ...options, save },
	);

	await save();
	signal?.throwIfAborted();

	if (failures.length > 0) {
		throw new Error(`${String(failures.length)} images failed to render:\n${formatList(failures)}`);
	}

	await prune.apply();
	await save();
	await writeEngine(statePath);
	await recordConsumedManifest(statePath, manifest);

	return {
		...counts,
		isEngineChanged: engine !== undefined && engine !== engineId,
		pruned: prune.orphans.length,
		queued: purgeQueue.queued.size,
		total: manifest.derivatives.length,
	};
}
