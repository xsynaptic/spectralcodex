import type { AstroIntegration } from 'astro';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ImageQuality } from '#image-manifest.ts';
import type { ImageScanOptions } from '#output-scan.ts';

import { createDevImageResolver } from '#dev-resolver.ts';
import {
	formatList,
	getImageCachePaths,
	readConsumedManifest,
	resolveImageSources,
	writeBuildId,
	writeManifest,
} from '#image-manifest.ts';
import { scanImageNames } from '#output-scan.ts';

export interface ImagePipelineOptions {
	baseUrl: string;
	cachePath: string;
	mediaPath: string;
	quality: ImageQuality;
	scan?: ImageScanOptions;
}

function decodeImageName(pathname: string) {
	try {
		return decodeURIComponent(pathname).replace(/^\/+/, '');
	} catch {
		return;
	}
}

async function isBuiltFrom(statePath: string, mediaPath: string) {
	try {
		const manifest = await readConsumedManifest(statePath);

		return manifest?.mediaPath === mediaPath;
	} catch {
		return false;
	}
}

export default function imagePipeline({
	baseUrl,
	cachePath,
	mediaPath,
	quality,
	scan,
}: ImagePipelineOptions): AstroIntegration {
	if (baseUrl.replace(/\/+$/, '') === '') {
		throw new Error(
			'imagePipeline needs a baseUrl below the site root; at the root, every request and every root-relative URL would count as an image',
		);
	}

	const absoluteMediaPath = path.resolve(mediaPath);
	const { devPath, filesPath, statePath } = getImageCachePaths(path.resolve(cachePath));

	return {
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				const distPath = fileURLToPath(dir);
				const buildId = randomUUID();
				const { invalid, names } = await scanImageNames(distPath, { baseUrl, ...scan });

				if (invalid.length > 0) {
					throw new Error(
						`${String(invalid.length)} published image URLs are outside the name grammar, starting with:\n${formatList(invalid)}`,
					);
				}

				const files = await resolveImageSources(absoluteMediaPath, names);

				await writeManifest(statePath, { buildId, files, mediaPath: absoluteMediaPath, quality });
				await writeBuildId(distPath, buildId);

				logger.info(
					`${String(names.size)} images from ${String(new Set(Object.values(files)).size)} sources`,
				);
			},
			'astro:server:setup': async ({ logger, server }) => {
				// With an absolute base URL, dev loads images straight from the image host
				if (!baseUrl.startsWith('/')) return;

				const mediaPathKey = createHash('sha256')
					.update(absoluteMediaPath)
					.digest('hex')
					.slice(0, 8);
				const getDevImage = createDevImageResolver({
					builtPath: (await isBuiltFrom(statePath, absoluteMediaPath)) ? filesPath : undefined,
					cachePath: path.resolve(devPath, mediaPathKey),
					mediaPath: absoluteMediaPath,
					quality,
				});

				async function serveDevImage(request: IncomingMessage, response: ServerResponse) {
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
						response.setHeader(
							'Content-Type',
							filePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
						);
						response.end(await readFile(filePath));
					} catch (error) {
						logger.error(`${pathname}: ${error instanceof Error ? error.message : String(error)}`);
						response.statusCode = 500;
						response.end();
					}
				}

				server.middlewares.use(baseUrl.replace(/\/+$/, ''), (request, response) => {
					void serveDevImage(request, response);
				});
			},
		},
		name: 'astro-image-pipeline',
	};
}
