import type { OutputInfo } from 'sharp';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import pLimit from 'p-limit';
import sharp from 'sharp';

import type { ImageFormat, ImageName } from '#image-name.ts';
import type { ImageManifest } from '#image-state.ts';
import type { RenderJobOptions } from '#run-render-jobs.ts';
import type { SourceFingerprints } from '#source-fingerprints.ts';

import { formatList } from '#format.ts';
import { imageRenderRevision, serializeEncoding } from '#image-encoding.ts';
import { parseImageName } from '#image-name.ts';
import { isWithinSource } from '#image-presets.ts';
import { engineId, renderImage } from '#image-render.ts';
import { getImageCachePaths, readCurrentManifest } from '#image-state.ts';
import { hashRenderKey } from '#render-key.ts';
import { getDefaultConcurrency, runRenderJobs } from '#run-render-jobs.ts';
import { createSourceFingerprints } from '#source-fingerprints.ts';
import { UserError } from '#user-error.ts';

export interface ImageRenderOptions extends Pick<
	RenderJobOptions,
	'onFailure' | 'onProgress' | 'onReplace' | 'signal'
> {
	cachePath: string;
}

interface ImageRendition extends ImageName {
	name: string;
	sourceId: string;
}

function sortNames(names: ReadonlyArray<string>) {
	return names.toSorted((first, second) => first.localeCompare(second));
}

export function getRenditionKey({
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
	return hashRenderKey([
		digest,
		format,
		serializeEncoding(encoding),
		width,
		height ?? '',
		imageRenderRevision,
		engine,
	]);
}

function getManifestRenditions(manifest: ImageManifest) {
	const renditions: Array<ImageRendition> = [];
	const invalid: Array<string> = [];

	for (const [name, sourceId] of Object.entries(manifest.renditions)) {
		const parsed = parseImageName(name);

		if (parsed) {
			renditions.push({ ...parsed, name, sourceId });
		} else {
			invalid.push(name);
		}
	}

	if (invalid.length > 0) {
		throw new UserError(
			`${String(invalid.length)} manifest names are outside the grammar; rebuild first:\n${formatList(sortNames(invalid))}`,
		);
	}

	return renditions;
}

async function readSourceDigests(
	fingerprints: SourceFingerprints,
	{ mediaPath }: ImageManifest,
	{ concurrency, renditions }: { concurrency: number; renditions: ReadonlyArray<ImageRendition> },
) {
	const limit = pLimit(concurrency);
	const digests = new Map<string, string>();
	const vanished: Array<string> = [];
	const upscaled: Array<string> = [];
	const renditionsBySource = Map.groupBy(renditions, (rendition) => rendition.sourceId);

	await Promise.all(
		[...renditionsBySource].map(([sourceId, sourceRenditions]) =>
			limit(async () => {
				const fingerprint = await fingerprints.get(path.resolve(mediaPath, sourceId));

				if (!fingerprint) {
					vanished.push(sourceId);
					return;
				}

				for (const rendition of sourceRenditions) {
					if (!isWithinSource(rendition, fingerprint)) {
						upscaled.push(
							`${rendition.name} (source ${String(fingerprint.width)}x${String(fingerprint.height)})`,
						);
					}
				}

				digests.set(sourceId, fingerprint.sha256);
			}),
		),
	);

	if (vanished.length > 0) {
		throw new UserError(
			`${String(vanished.length)} sources vanished since the build; rebuild first:\n${formatList(sortNames(vanished))}`,
		);
	}

	if (upscaled.length > 0) {
		throw new UserError(
			`${String(upscaled.length)} renditions are larger than their source; rebuild first:\n${formatList(sortNames(upscaled))}`,
		);
	}

	return digests;
}

function assertEncodedSize(rendition: ImageRendition, info: OutputInfo) {
	if (info.width === rendition.width && (rendition.height ?? info.height) === info.height) return;

	throw new Error(`encoded ${String(info.width)}x${String(info.height)}`);
}

function getManifestRenditionKey(
	rendition: ImageRendition,
	manifest: ImageManifest,
	digests: ReadonlyMap<string, string>,
) {
	const digest = digests.get(rendition.sourceId);

	if (!digest) throw new Error(`no digest was read for source ${rendition.sourceId}`);

	return getRenditionKey({
		digest,
		encoding: manifest.encoding[rendition.format],
		engine: engineId,
		format: rendition.format,
		height: rendition.height,
		width: rendition.width,
	});
}

async function encodeRendition(rendition: ImageRendition, manifest: ImageManifest) {
	const { data, info } = await renderImage(path.resolve(manifest.mediaPath, rendition.sourceId), {
		encoding: manifest.encoding,
		format: rendition.format,
		height: rendition.height,
		limitInputPixels: manifest.limitInputPixels,
		width: rendition.width,
	});

	assertEncodedSize(rendition, info);

	return data;
}

async function readImageJobs(cachePath: string, concurrency: number) {
	const { renditionsPath } = getImageCachePaths(cachePath);
	const manifest = await readCurrentManifest(cachePath);
	const renditions = getManifestRenditions(manifest);
	const digests = await readSourceDigests(createSourceFingerprints(cachePath), manifest, {
		concurrency,
		renditions,
	});
	const jobs = renditions.map((rendition) => ({
		key: getManifestRenditionKey(rendition, manifest, digests),
		name: rendition.name,
		render: () => encodeRendition(rendition, manifest),
	}));

	return { directory: renditionsPath, jobs };
}

export async function renderImages(options: ImageRenderOptions) {
	const cachePath = path.resolve(options.cachePath);
	const concurrency = getDefaultConcurrency();
	const run = await readImageJobs(cachePath, concurrency);

	// Process-wide; the job pool supplies the parallelism instead of libvips threads
	sharp.concurrency(1);
	sharp.cache(false);

	const counts = await runRenderJobs({ ...options, ...run, concurrency });

	// Dev serves built renditions first, so its own renders are spare once a render completes
	await fs.rm(getImageCachePaths(cachePath).devPath, { force: true, recursive: true });

	return counts;
}
