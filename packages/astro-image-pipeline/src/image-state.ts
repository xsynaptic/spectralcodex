import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ResolvedImageEncoding } from '#image-encoding.ts';
import type { OpenGraphCard } from '#open-graph-cards.ts';

import { readFileIfExists, readJsonFile, writeJsonFile } from '#files.ts';
import { UserError } from '#user-error.ts';

const imageManifestFile = 'manifest.json';
const imageBuildIdFile = 'image-build-id.txt';

export const imageManifestVersion = 4;

export interface ImageManifest {
	buildId: string;
	distPath: string;
	encoding: ResolvedImageEncoding;
	limitInputPixels: number;
	mediaPath: string;
	openGraphCards: Record<string, OpenGraphCard>;
	renditions: Record<string, string>;
	version: typeof imageManifestVersion;
}

export function getImageCachePaths(cachePath: string) {
	return {
		devPath: `${cachePath}/dev`,
		openGraphCardsPath: `${cachePath}/cards`,
		recordsPath: `${cachePath}/records`,
		renditionsPath: `${cachePath}/renditions`,
	};
}

function isCurrentManifest(manifest: { version?: number }): manifest is ImageManifest {
	return manifest.version === imageManifestVersion;
}

export async function readManifest(cachePath: string) {
	const manifestPath = path.join(cachePath, imageManifestFile);
	const manifest = await readJsonFile<{ version?: number }>(manifestPath);

	if (!manifest) return;

	if (!isCurrentManifest(manifest)) {
		throw new UserError(
			`The image manifest ${manifestPath} is version ${String(manifest.version ?? 1)}, not ${String(imageManifestVersion)}; rebuild first`,
		);
	}

	return manifest;
}

export async function readCurrentManifest(cachePath: string) {
	const manifest = await readManifest(cachePath);

	if (!manifest) throw new UserError(`No image manifest in ${cachePath}; build first`);

	const distBuildId = await readBuildId(manifest.distPath);

	if (distBuildId !== manifest.buildId) {
		throw new UserError(
			`Manifest build ${manifest.buildId} does not match ${manifest.distPath} (${distBuildId ?? 'no build id'}); rebuild first`,
		);
	}

	return manifest;
}

export async function writeManifest(cachePath: string, manifest: ImageManifest) {
	await writeJsonFile(path.join(cachePath, imageManifestFile), manifest);
}

async function readBuildId(outputPath: string) {
	const data = await readFileIfExists(path.join(outputPath, imageBuildIdFile));

	return data?.toString('utf8').trim();
}

export async function writeBuildId(outputPath: string, buildId: string) {
	await fs.writeFile(path.join(outputPath, imageBuildIdFile), buildId);
}
