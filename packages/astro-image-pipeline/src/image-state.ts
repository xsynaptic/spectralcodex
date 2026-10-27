import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ResolvedImageEncoding } from '#image-encoding.ts';
import type { OpenGraphCard } from '#open-graph-cards.ts';

import { readFileIfExists, readJsonFile, writeJsonFile } from '#files.ts';
import { Refusal } from '#refusal.ts';

const imageManifestFile = 'manifest.json';
const imageBuildIdFile = 'image-build-id.txt';
const engineFile = 'engine.txt';

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
		devPath: `${cachePath}/img-dev`,
		openGraphCardsPath: `${cachePath}/img-cards`,
		openGraphCardsStatePath: `${cachePath}/img-cards-state`,
		recordsPath: `${cachePath}/img-state/records`,
		renditionsPath: `${cachePath}/img`,
		statePath: `${cachePath}/img-state`,
	};
}

function isCurrentManifest(manifest: { version?: number }): manifest is ImageManifest {
	return manifest.version === imageManifestVersion;
}

export async function readManifest(statePath: string) {
	const manifest = await readJsonFile<{ version?: number }>(
		path.join(statePath, imageManifestFile),
	);

	if (!manifest) return;

	if (!isCurrentManifest(manifest)) {
		throw new Refusal(
			`The image manifest in ${statePath} is version ${String(manifest.version ?? 1)}, not ${String(imageManifestVersion)}; rebuild first`,
		);
	}

	return manifest;
}

export async function readCurrentManifest(statePath: string) {
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

export async function writeManifest(statePath: string, manifest: ImageManifest) {
	await writeJsonFile(path.join(statePath, imageManifestFile), manifest);
}

async function readBuildId(outputPath: string) {
	const data = await readFileIfExists(path.join(outputPath, imageBuildIdFile));

	return data?.toString('utf8').trim();
}

export async function writeBuildId(outputPath: string, buildId: string) {
	await fs.writeFile(path.join(outputPath, imageBuildIdFile), buildId);
}

export async function readEngine(statePath: string) {
	const data = await readFileIfExists(path.join(statePath, engineFile));

	return data?.toString('utf8').trim();
}

export async function writeEngine(statePath: string, engineId: string) {
	await fs.mkdir(statePath, { recursive: true });
	await fs.writeFile(path.join(statePath, engineFile), `${engineId}\n`);
}
