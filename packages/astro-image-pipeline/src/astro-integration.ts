import type { AstroIntegration, AstroIntegrationLogger } from 'astro';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ResolvedImageEncoding } from '#image-encoding.ts';
import type { ImageSourceResolver } from '#image-sources.ts';
import type { ImageManifest } from '#image-state.ts';

import { createDevImageResolver } from '#dev-resolver.ts';
import { imageRecordsVariable } from '#image-recorder.ts';
import { readImageRecords, resetImageRecords } from '#image-records.ts';
import { createDirectorySources } from '#image-sources.ts';
import {
	getImageCachePaths,
	imageManifestVersion,
	readManifest,
	writeBuildId,
	writeManifest,
} from '#image-state.ts';
import { Refusal } from '#refusal.ts';

export type { ImageSourceResolver } from '#image-sources.ts';

export interface ImagePipelineOptions {
	baseUrl: string;
	cachePath: string;
	limitInputPixels?: number;
	mediaPath: string;
	pipeline: { encoding: ResolvedImageEncoding };
	sources?: ImageSourceResolver;
}

const sharpDefaultInputPixelLimit = 0x3f_ff * 0x3f_ff;

function decodeImageName(pathname: string) {
	try {
		return decodeURIComponent(pathname).replace(/^\/+/, '');
	} catch {
		return;
	}
}

async function readPreviousFiles(statePath: string) {
	try {
		const previous = await readManifest(statePath);

		return Object.entries(previous?.files ?? {});
	} catch (error) {
		if (error instanceof Refusal) return [];

		throw error;
	}
}

async function readRecordedFiles({
	isIncremental,
	logger,
	pageCount,
	recordsPath,
	statePath,
}: {
	isIncremental: boolean;
	logger: AstroIntegrationLogger;
	pageCount: number;
	recordsPath: string;
	statePath: string;
}) {
	const recorded = await readImageRecords(recordsPath);

	// Pages an incremental build skips still count in `pages`, but record nothing
	if (isIncremental) {
		logger.warn(
			"Incremental build: pages restored from cache record nothing, so the manifest keeps the previous build's names too; names only fall out on a full build",
		);

		return new Map([...(await readPreviousFiles(statePath)), ...recorded]);
	}

	if (recorded.size === 0 && pageCount > 0) {
		throw new Error(
			`No image names were recorded while building ${String(pageCount)} pages; build image URLs with getName at render time, in a runtime that has node:fs`,
		);
	}

	return recorded;
}

async function writeBuildManifest({
	distPath,
	files,
	logger,
	manifest,
	statePath,
}: {
	distPath: string;
	files: ReadonlyMap<string, string>;
	logger: AstroIntegrationLogger;
	manifest: Pick<ImageManifest, 'encoding' | 'limitInputPixels' | 'mediaPath'>;
	statePath: string;
}) {
	const buildId = randomUUID();

	await writeManifest(statePath, {
		...manifest,
		buildId,
		distPath,
		files: Object.fromEntries(files),
		version: imageManifestVersion,
	});
	await writeBuildId(distPath, buildId);

	logger.info(`${String(files.size)} images from ${String(new Set(files.values()).size)} sources`);
}

function createDevImageHandler(
	getDevImage: ReturnType<typeof createDevImageResolver>,
	logger: AstroIntegrationLogger,
) {
	return async function serveDevImage(request: IncomingMessage, response: ServerResponse) {
		const { pathname } = new URL(request.url ?? '/', 'http://localhost');
		const name = decodeImageName(pathname);

		if (name === undefined) {
			response.statusCode = 400;
			response.end();
			return;
		}

		try {
			const filePath = await getDevImage(name);

			if (!filePath) {
				response.statusCode = 404;
				response.end();
				return;
			}

			response.setHeader('Cache-Control', 'no-cache');
			response.setHeader('Content-Type', filePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
			response.end(await readFile(filePath));
		} catch (error) {
			logger.error(`${pathname}: ${error instanceof Error ? error.message : String(error)}`);
			response.statusCode = 500;
			response.end();
		}
	};
}

async function isBuiltFrom(statePath: string, mediaPath: string) {
	try {
		const manifest = await readManifest(statePath);

		return manifest?.mediaPath === mediaPath;
	} catch {
		return false;
	}
}

export default function imagePipeline({
	baseUrl,
	cachePath,
	limitInputPixels = sharpDefaultInputPixelLimit,
	mediaPath,
	pipeline,
	sources,
}: ImagePipelineOptions): AstroIntegration {
	if (baseUrl.replace(/\/+$/, '') === '') {
		throw new Error(
			'imagePipeline needs a baseUrl below the site root; at the root, every request and every root-relative URL would count as an image',
		);
	}

	const absoluteMediaPath = path.resolve(mediaPath);
	const { devPath, filesPath, recordsPath, statePath } = getImageCachePaths(
		path.resolve(cachePath),
	);
	let isIncremental = false;

	return {
		hooks: {
			'astro:build:done': async ({ dir, logger, pages }) => {
				try {
					const distPath = fileURLToPath(dir);
					const files = await readRecordedFiles({
						isIncremental,
						logger,
						pageCount: pages.length,
						recordsPath,
						statePath,
					});

					await writeBuildManifest({
						distPath,
						files,
						logger,
						manifest: {
							encoding: pipeline.encoding,
							limitInputPixels,
							mediaPath: absoluteMediaPath,
						},
						statePath,
					});
				} finally {
					Reflect.deleteProperty(process.env, imageRecordsVariable);
				}
			},
			'astro:config:setup': async ({ command, config }) => {
				if (command !== 'build') return;

				isIncremental = config.experimental.incrementalBuild;
				await resetImageRecords(recordsPath);
				process.env[imageRecordsVariable] = recordsPath;
			},
			'astro:server:setup': async ({ logger, server }) => {
				// An absolute base URL means dev fetches images from the live host
				if (!baseUrl.startsWith('/')) return;

				const mediaPathKey = createHash('sha256')
					.update(absoluteMediaPath)
					.digest('hex')
					.slice(0, 8);
				const getDevImage = createDevImageResolver({
					builtPath: (await isBuiltFrom(statePath, absoluteMediaPath)) ? filesPath : undefined,
					cachePath: path.resolve(devPath, mediaPathKey),
					encoding: pipeline.encoding,
					limitInputPixels,
					mediaPath: absoluteMediaPath,
					sources: sources ?? createDirectorySources(absoluteMediaPath),
				});

				const serveDevImage = createDevImageHandler(getDevImage, logger);

				server.middlewares.use(baseUrl.replace(/\/+$/, ''), (request, response) => {
					void serveDevImage(request, response);
				});
			},
		},
		name: 'astro-image-pipeline',
	};
}
