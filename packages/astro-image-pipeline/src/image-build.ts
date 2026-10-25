import type { OutputInfo } from 'sharp';

import { createHash } from 'node:crypto';
import path from 'node:path';
import pLimit from 'p-limit';
import sharp from 'sharp';

import type { ImageFormat, ImageName } from '#image-name.ts';
import type { ImageManifest } from '#image-state.ts';
import type { DerivativeRunOptions } from '#run-derivatives.ts';
import type { SourceFingerprints } from '#source-fingerprints.ts';

import { formatList } from '#format.ts';
import { imageRenderRevision, serializeEncoding } from '#image-encoding.ts';
import { parseImageName } from '#image-name.ts';
import { isWithinSource } from '#image-presets.ts';
import { engineId, renderImage } from '#image-render.ts';
import { getImageCachePaths, readCurrentManifest, readEngine, writeEngine } from '#image-state.ts';
import { Refusal } from '#refusal.ts';
import { getDefaultConcurrency, runDerivatives } from '#run-derivatives.ts';
import { createSourceFingerprints } from '#source-fingerprints.ts';

export interface ImageRenderOptions extends Pick<
	DerivativeRunOptions,
	'onFailure' | 'onProgress' | 'onReplace' | 'signal'
> {
	cachePath: string;
}

interface ImageFile extends ImageName {
	name: string;
	sourceId: string;
}

function sortNames(names: ReadonlyArray<string>) {
	return names.toSorted((first, second) => first.localeCompare(second));
}

export function getFileKey({
	digest,
	encoding,
	engine,
	format,
	height,
	width,
}: {
	digest: string;
	encoding: ImageManifest['encoding'][ImageFormat];
	engine: string;
	format: ImageFormat;
	height?: number | undefined;
	width: number;
}) {
	return createHash('sha256')
		.update(
			[
				digest,
				format,
				serializeEncoding(encoding),
				width,
				height ?? '',
				imageRenderRevision,
				engine,
			].join(':'),
		)
		.digest('hex')
		.slice(0, 16);
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
	{ concurrency, files }: { concurrency: number; files: ReadonlyArray<ImageFile> },
) {
	const limit = pLimit(concurrency);
	const digests = new Map<string, string>();
	const vanished: Array<string> = [];
	const upscaled: Array<string> = [];
	const filesBySource = Map.groupBy(files, (file) => file.sourceId);

	await Promise.all(
		[...filesBySource].map(([sourceId, sourceFiles]) =>
			limit(async () => {
				const fingerprint = await fingerprints.get(path.resolve(mediaPath, sourceId));

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

function assertEncodedSize(file: ImageFile, info: OutputInfo) {
	if (info.width === file.width && (file.height ?? info.height) === info.height) return;

	throw new Error(`encoded ${String(info.width)}x${String(info.height)}`);
}

function getManifestFileKey(
	file: ImageFile,
	manifest: ImageManifest,
	digests: ReadonlyMap<string, string>,
) {
	const digest = digests.get(file.sourceId);

	if (!digest) throw new Error(`no digest was read for source ${file.sourceId}`);

	return getFileKey({
		digest,
		encoding: manifest.encoding[file.format],
		engine: engineId,
		format: file.format,
		height: file.height,
		width: file.width,
	});
}

async function renderFile(file: ImageFile, manifest: ImageManifest) {
	const { data, info } = await renderImage(path.resolve(manifest.mediaPath, file.sourceId), {
		encoding: manifest.encoding,
		format: file.format,
		height: file.height,
		limitInputPixels: manifest.limitInputPixels,
		width: file.width,
	});

	assertEncodedSize(file, info);

	return data;
}

async function readImageJobs(cachePath: string, concurrency: number) {
	const { filesPath, statePath } = getImageCachePaths(cachePath);
	const manifest = await readCurrentManifest(statePath);
	const files = getManifestFiles(manifest);
	const digests = await readSourceDigests(createSourceFingerprints(cachePath), manifest, {
		concurrency,
		files,
	});
	const jobs = files.map((file) => ({
		key: getManifestFileKey(file, manifest, digests),
		name: file.name,
		render: () => renderFile(file, manifest),
	}));

	return { directory: filesPath, jobs, statePath };
}

export async function renderImages(options: ImageRenderOptions) {
	const cachePath = path.resolve(options.cachePath);
	const concurrency = getDefaultConcurrency();
	const run = await readImageJobs(cachePath, concurrency);
	const engine = await readEngine(run.statePath);

	// Process-wide; the job pool supplies the parallelism instead of libvips threads
	sharp.concurrency(1);
	sharp.cache(false);

	const counts = await runDerivatives({ ...options, ...run, concurrency });

	await writeEngine(run.statePath, engineId);

	return { ...counts, isEngineChanged: engine !== undefined && engine !== engineId };
}
