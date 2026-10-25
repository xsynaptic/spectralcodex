import type { OutputInfo } from 'sharp';

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pLimit from 'p-limit';
import sharp from 'sharp';

import type { ImageManifest } from '#image-manifest.ts';
import type { ImageName } from '#image-name.ts';
import type { SourceFingerprints } from '#source-fingerprints.ts';

import { createFileCache } from '#file-cache.ts';
import { readFileIfExists } from '#files.ts';
import {
	formatList,
	getImageCachePaths,
	readBuildId,
	readEngine,
	readGraceManifest,
	readManifest,
	recordConsumedManifest,
	writeEngine,
} from '#image-manifest.ts';
import { imageFormats, parseImageName } from '#image-name.ts';
import { isWithinSource } from '#image-presets.ts';
import { engineId, imageRenderRevision, renderImage } from '#image-render.ts';
import { Refusal } from '#refusal.ts';
import { createSourceFingerprints } from '#source-fingerprints.ts';

// Each sharp job uses one libuv thread, so more jobs than UV_THREADPOOL_SIZE (default 4) just wait in line
const jobCount = Number(process.env.UV_THREADPOOL_SIZE) || 4;

const saveInterval = 10_000;

const renderLockFile = 'render.lock';

export interface ImageRenderOptions {
	cachePath: string;
	isMassPruneAllowed?: boolean;
	onProgress?: (progress: { done: number; total: number }) => void;
	onReplace?: (name: string) => Promise<void>;
	signal?: AbortSignal;
}

type ImageCache = Awaited<ReturnType<typeof createFileCache>>;

interface ImageCounts {
	encoded: number;
	fresh: number;
	overwritten: number;
	written: number;
}

interface ImageFile extends ImageName {
	name: string;
	sourceId: string;
}

function sortNames(names: ReadonlyArray<string>) {
	return names.toSorted((first, second) => first.localeCompare(second));
}

function getFileKey(file: ImageFile, quality: number, sourceDigest: string) {
	return createHash('sha256')
		.update(
			[
				sourceDigest,
				file.format,
				quality,
				file.width,
				file.height ?? '',
				imageRenderRevision,
				engineId,
			].join(':'),
		)
		.digest('hex')
		.slice(0, 16);
}

async function didClaimLock(lockPath: string) {
	try {
		const handle = await fs.open(lockPath, 'wx');

		await handle.writeFile(String(process.pid));
		await handle.close();

		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;

		throw error;
	}
}

function isProcessAlive(pid: number) {
	try {
		process.kill(pid, 0);

		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code !== 'ESRCH';
	}
}

async function readLockHolder(lockPath: string) {
	const data = await readFileIfExists(lockPath);
	const pid = Number(data?.toString('utf8').trim());

	return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
}

async function acquireRenderLock(statePath: string) {
	const lockPath = path.join(statePath, renderLockFile);

	await fs.mkdir(statePath, { recursive: true });

	if (await didClaimLock(lockPath)) return lockPath;

	const holder = await readLockHolder(lockPath);

	if (holder !== undefined && isProcessAlive(holder)) {
		throw new Refusal(`Another render (pid ${String(holder)}) holds ${lockPath}`);
	}

	await fs.rm(lockPath, { force: true });

	if (await didClaimLock(lockPath)) return lockPath;

	throw new Refusal(`Another render took over the stale lock at ${lockPath}`);
}

async function readCurrentManifest(statePath: string) {
	const manifest = await readManifest(statePath);

	if (!manifest) throw new Refusal(`No image manifest in ${statePath}; build first`);

	const distBuildId = await readBuildId(manifest.distPath);

	if (distBuildId !== manifest.buildId) {
		throw new Refusal(
			`Manifest build ${manifest.buildId} does not match ${manifest.distPath} (${distBuildId ?? 'no build id'}); rebuild first`,
		);
	}

	return manifest;
}

function getManifestFiles(manifest: ImageManifest) {
	const files: Array<ImageFile> = [];
	const invalid: Array<string> = [];

	for (const [name, sourceId] of Object.entries(manifest.files)) {
		const parsed = parseImageName(name);

		if (parsed) {
			files.push({ ...parsed, name, sourceId });
		} else {
			invalid.push(name);
		}
	}

	if (invalid.length > 0) {
		throw new Refusal(
			`${String(invalid.length)} manifest names are outside the grammar; rebuild first:\n${formatList(sortNames(invalid))}`,
		);
	}

	return files;
}

async function readSourceDigests(
	fingerprints: SourceFingerprints,
	{ mediaPath }: ImageManifest,
	files: ReadonlyArray<ImageFile>,
) {
	const limit = pLimit(jobCount);
	const digests = new Map<string, string>();
	const vanished: Array<string> = [];
	const upscaled: Array<string> = [];
	const filesBySource = Map.groupBy(files, (file) => file.sourceId);

	await Promise.all(
		[...filesBySource].map(([sourceId, sourceFiles]) =>
			limit(async () => {
				const fingerprint = await fingerprints.get(path.join(mediaPath, sourceId));

				if (!fingerprint) {
					vanished.push(sourceId);
					return;
				}

				for (const file of sourceFiles) {
					if (!isWithinSource(file, fingerprint)) {
						upscaled.push(
							`${file.name} (source ${String(fingerprint.width)}x${String(fingerprint.height)})`,
						);
					}
				}

				digests.set(sourceId, fingerprint.sha256);
			}),
		),
	);

	if (vanished.length > 0) {
		throw new Refusal(
			`${String(vanished.length)} sources vanished since the build; rebuild first:\n${formatList(sortNames(vanished))}`,
		);
	}

	if (upscaled.length > 0) {
		throw new Refusal(
			`${String(upscaled.length)} images are larger than their source; rebuild first:\n${formatList(sortNames(upscaled))}`,
		);
	}

	return digests;
}

async function planPrune(
	cache: ImageCache,
	manifest: ImageManifest,
	{ isMassPruneAllowed, statePath }: { isMassPruneAllowed: boolean; statePath: string },
) {
	const graceManifest = await readGraceManifest(statePath, manifest);
	const keep = new Set([
		...Object.keys(manifest.files),
		...Object.keys(graceManifest?.files ?? {}),
	]);

	return cache.planPrune(keep, { isMassPruneAllowed });
}

function assertEncodedSize(file: ImageFile, info: OutputInfo) {
	if (info.width === file.width && (file.height ?? info.height) === info.height) return;

	throw new Error(`encoded ${String(info.width)}x${String(info.height)}`);
}

function createFileProcessor({
	cache,
	counts,
	digests,
	manifest,
}: {
	cache: ImageCache;
	counts: ImageCounts;
	digests: Map<string, string>;
	manifest: ImageManifest;
}) {
	return async function processFile(file: ImageFile) {
		const digest = digests.get(file.sourceId);

		if (!digest) throw new Error(`no digest was read for source ${file.sourceId}`);

		const quality = manifest.quality[file.format];
		const key = getFileKey(file, quality, digest);

		if (cache.isFresh(file.name, key)) {
			counts.fresh++;
			return;
		}

		const { data, info } = await renderImage(path.join(manifest.mediaPath, file.sourceId), {
			format: file.format,
			height: file.height,
			quality,
			width: file.width,
		});

		counts.encoded++;
		assertEncodedSize(file, info);

		if (await cache.write(file.name, key, data)) counts.written++;
	};
}

async function runJobs(
	files: ReadonlyArray<ImageFile>,
	processFile: (file: ImageFile) => Promise<void>,
	{
		onProgress,
		save,
		signal,
	}: Pick<ImageRenderOptions, 'onProgress' | 'signal'> & { save: () => Promise<void> },
) {
	const limit = pLimit(jobCount);
	const failures: Array<string> = [];
	let done = 0;
	let lastSave = Date.now();

	await Promise.all(
		files.map((file) =>
			limit(async () => {
				if (signal?.aborted) return;

				try {
					await processFile(file);
				} catch (error) {
					failures.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
				}

				done++;
				onProgress?.({ done, total: files.length });

				if (Date.now() - lastSave < saveInterval) return;

				lastSave = Date.now();
				await save();
			}),
		),
	);

	return failures;
}

async function renderManifest(options: ImageRenderOptions, cachePath: string) {
	const { isMassPruneAllowed = false, onReplace, signal } = options;
	const { filesPath, statePath } = getImageCachePaths(cachePath);
	const manifest = await readCurrentManifest(statePath);
	const files = getManifestFiles(manifest);
	const engine = await readEngine(statePath);
	const counts: ImageCounts = { encoded: 0, fresh: 0, overwritten: 0, written: 0 };
	const cache = await createFileCache({
		directory: filesPath,
		extensions: imageFormats,
		onReplace: async (name) => {
			counts.overwritten++;
			await onReplace?.(name);
		},
		statePath,
	});
	const prune = await planPrune(cache, manifest, { isMassPruneAllowed, statePath });
	const digests = await readSourceDigests(createSourceFingerprints(cachePath), manifest, files);

	// These sharp settings affect the whole process, not only this function
	sharp.concurrency(1);
	sharp.cache(false);

	const saveLimit = pLimit(1);
	const save = () => saveLimit(() => cache.save());
	const failures = await runJobs(files, createFileProcessor({ cache, counts, digests, manifest }), {
		...options,
		save,
	});

	await save();
	signal?.throwIfAborted();

	if (failures.length > 0) {
		throw new Error(`${String(failures.length)} images failed to render:\n${formatList(failures)}`);
	}

	await prune.apply();
	await save();
	await writeEngine(statePath, engineId);
	await recordConsumedManifest(statePath, manifest);

	return {
		...counts,
		isEngineChanged: engine !== undefined && engine !== engineId,
		pruned: prune.orphans.length,
		total: files.length,
	};
}

export async function renderImages(options: ImageRenderOptions) {
	const cachePath = path.resolve(options.cachePath);
	const { statePath } = getImageCachePaths(cachePath);
	const lockPath = await acquireRenderLock(statePath);

	try {
		return await renderManifest(options, cachePath);
	} finally {
		await fs.rm(lockPath, { force: true });
	}
}
