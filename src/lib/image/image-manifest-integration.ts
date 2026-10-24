import type { ImageManifest } from '@spectralcodex/shared/images';
import type { AstroIntegration } from 'astro';

import {
	getImageCachePaths,
	getImageManifestRecorder,
	imageBuildIdFile,
	imageManifestFile,
} from '@spectralcodex/shared/images';
import { collectImagePaths } from '@spectralcodex/shared/images-dist';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from 'remeda';

export function getImageManifest(buildId: string, mediaPath: string): ImageManifest {
	const { derivatives, sources } = getImageManifestRecorder();

	return {
		buildId,
		derivatives: R.sortBy([...derivatives.values()], R.prop('path')),
		mediaPath,
		sources: Object.fromEntries(R.sortBy([...sources], ([id]) => id)),
	};
}

export async function getUnrecordedImagePaths(
	distPath: string,
	imageBaseUrl: string,
	manifest: ImageManifest,
) {
	const recordedPaths = new Set(manifest.derivatives.map((derivative) => derivative.path));
	const imagePaths = await collectImagePaths(distPath, imageBaseUrl);

	return [...imagePaths]
		.filter((imagePath) => !recordedPaths.has(imagePath))
		.toSorted((first, second) => first.localeCompare(second));
}

export default function imageManifest({
	cachePath,
	imageBaseUrl,
	mediaPath,
}: {
	cachePath: string;
	imageBaseUrl: string;
	mediaPath: string;
}): AstroIntegration {
	const buildId = randomUUID();
	const { statePath } = getImageCachePaths(path.resolve(cachePath));

	return {
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				const distPath = fileURLToPath(dir);
				const manifest = getImageManifest(buildId, path.resolve(mediaPath));
				const unrecorded = await getUnrecordedImagePaths(distPath, imageBaseUrl, manifest);

				if (unrecorded.length > 0) {
					throw new Error(
						`${String(unrecorded.length)} published image paths are missing from the manifest, starting with:\n${unrecorded.slice(0, 10).join('\n')}`,
					);
				}

				await mkdir(statePath, { recursive: true });
				await writeFile(path.join(statePath, imageManifestFile), JSON.stringify(manifest));
				await writeFile(path.join(distPath, imageBuildIdFile), buildId);

				logger.info(
					`${String(manifest.derivatives.length)} derivatives from ${String(Object.keys(manifest.sources).length)} images recorded`,
				);
			},
			'astro:build:start': () => {
				const { derivatives, sources } = getImageManifestRecorder();

				derivatives.clear();
				sources.clear();
			},
		},
		name: 'image-manifest',
	};
}
