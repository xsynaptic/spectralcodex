import type { ImageManifest } from '@spectralcodex/shared/images';

import { imageConsumedManifestFile, imageManifestFile } from '@spectralcodex/shared/images';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { readFileIfExists, readJsonFile, writeJsonFile } from '#shared/utils.ts';

const engineFile = 'engine.txt';
const previousManifestFile = 'manifest-previous.json';

export const engineVersions = sharp.versions;

// mozjpeg's trellis arithmetic differs between CPU architectures, so the platform is part of the engine
export const engineId = createHash('sha256')
	.update(JSON.stringify({ ...engineVersions, arch: process.arch, platform: process.platform }))
	.digest('hex')
	.slice(0, 8);

export async function readManifest(statePath: string) {
	return readJsonFile<ImageManifest>(path.join(statePath, imageManifestFile));
}

export async function readEngine(statePath: string) {
	const data = await readFileIfExists(path.join(statePath, engineFile));

	return data?.toString('utf8').trim();
}

export async function writeEngine(statePath: string) {
	await fs.mkdir(statePath, { recursive: true });
	await fs.writeFile(path.join(statePath, engineFile), `${engineId}\n`);
}

// Re-running against the same build keeps the older grace manifest instead of collapsing onto itself
export async function readGraceManifest(statePath: string, manifest: ImageManifest) {
	const consumed = await readJsonFile<ImageManifest>(
		path.join(statePath, imageConsumedManifestFile),
	);

	if (consumed?.buildId !== manifest.buildId) return consumed;

	return readJsonFile<ImageManifest>(path.join(statePath, previousManifestFile));
}

export async function recordConsumedManifest(statePath: string, manifest: ImageManifest) {
	const consumedPath = path.join(statePath, imageConsumedManifestFile);
	const consumed = await readJsonFile<ImageManifest>(consumedPath);

	if (consumed?.buildId === manifest.buildId) return;

	if (consumed) await fs.rename(consumedPath, path.join(statePath, previousManifestFile));

	await writeJsonFile(consumedPath, manifest);
}
