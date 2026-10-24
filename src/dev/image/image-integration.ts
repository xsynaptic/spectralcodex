import type { ImageManifest } from '@spectralcodex/shared/images';
import type { AstroIntegration } from 'astro';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { getImageCachePaths, imageConsumedManifestFile } from '@spectralcodex/shared/images';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createDevImageResolver } from '#dev/image/image-resolver.ts';

async function isBuiltFrom(statePath: string, mediaPath: string) {
	try {
		const manifest = JSON.parse(
			await readFile(path.join(statePath, imageConsumedManifestFile), 'utf8'),
		) as Pick<ImageManifest, 'mediaPath'>;

		return manifest.mediaPath === mediaPath;
	} catch {
		return false;
	}
}

export default function imageDev({
	cachePath,
	imageBaseUrl,
	mediaPath,
}: {
	cachePath: string;
	imageBaseUrl: string;
	mediaPath: string;
}): AstroIntegration {
	return {
		hooks: {
			'astro:server:setup': async ({ logger, server }) => {
				// An absolute base points dev at a real image host, which needs no local renders
				if (!imageBaseUrl.startsWith('/')) return;

				const absoluteMediaPath = path.resolve(mediaPath);
				const mediaPathKey = createHash('sha256')
					.update(absoluteMediaPath)
					.digest('hex')
					.slice(0, 8);
				const { derivativesPath, devPath, statePath } = getImageCachePaths(path.resolve(cachePath));
				const getDevImage = createDevImageResolver({
					builtPath: (await isBuiltFrom(statePath, absoluteMediaPath))
						? derivativesPath
						: undefined,
					cachePath: path.resolve(devPath, mediaPathKey),
					mediaPath: absoluteMediaPath,
				});

				async function serveDevImage(request: IncomingMessage, response: ServerResponse) {
					const { pathname } = new URL(request.url ?? '/', 'http://localhost');

					try {
						const filePath = await getDevImage(decodeURIComponent(pathname).replace(/^\/+/, ''));

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

				server.middlewares.use(imageBaseUrl.replace(/\/+$/, ''), (request, response) => {
					void serveDevImage(request, response);
				});
			},
		},
		name: 'image-dev',
	};
}
