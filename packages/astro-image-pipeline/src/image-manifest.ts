import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ImageFormat } from '#image-name.ts';

import { readFileIfExists, readJsonFile, writeJsonFile } from '#files.ts';
import { getImageStem, isImageSource, parseImageName } from '#image-name.ts';

const imageManifestFile = 'manifest.json';
const imageConsumedManifestFile = 'manifest-consumed.json';
const imageBuildIdFile = 'image-build-id.txt';
const previousManifestFile = 'manifest-previous.json';
const engineFile = 'engine.txt';

export type ImageQuality = Record<ImageFormat, number>;

export interface ImageManifest {
	buildId: string;
	distPath: string;
	files: Record<string, string>;
	mediaPath: string;
	quality: ImageQuality;
}

export function getImageCachePaths(cachePath: string) {
	return {
		devPath: `${cachePath}/img-dev`,
		filesPath: `${cachePath}/img`,
		statePath: `${cachePath}/img-state`,
	};
}

export function formatList(items: ReadonlyArray<string>) {
	return items
		.slice(0, 10)
		.map((item) => `  ${item}`)
		.join('\n');
}

async function listSourcesByStem(mediaPath: string) {
	const relativePaths = await fs.readdir(mediaPath, { recursive: true });
	const sources = new Map<string, Array<string>>();

	for (const relativePath of relativePaths) {
		const id = relativePath.split(path.sep).join('/');

		if (!isImageSource(id)) continue;

		const stem = getImageStem(id).toLowerCase();
		const ids = sources.get(stem);

		if (ids) {
			ids.push(id);
		} else {
			sources.set(stem, [id]);
		}
	}

	return sources;
}

// Stems are compared ignoring case, because macOS treats Foo.jpg and foo.jpg as the same file
function findSourceIds(sourcesByStem: Map<string, Array<string>>, name: string) {
	const stem = parseImageName(name)?.stem;

	if (stem === undefined) return [];

	const ids = sourcesByStem.get(stem.toLowerCase()) ?? [];

	if (ids.length === 1 && ids[0] !== undefined && getImageStem(ids[0]) !== stem) return [];

	return ids;
}

export async function resolveImageSources(mediaPath: string, names: Iterable<string>) {
	const sourcesByStem = await listSourcesByStem(mediaPath);
	const files: Record<string, string> = {};
	const missing: Array<string> = [];
	const shared = new Set<string>();

	const sortedNames = [...names].toSorted((first, second) => first.localeCompare(second));

	for (const name of sortedNames) {
		const ids = findSourceIds(sourcesByStem, name);

		if (ids.length > 1) {
			shared.add(ids.toSorted((first, second) => first.localeCompare(second)).join(', '));
			continue;
		}

		const [id] = ids;

		if (id === undefined) {
			missing.push(name);
			continue;
		}

		files[name] = id;
	}

	if (missing.length > 0) {
		throw new Error(
			`${String(missing.length)} published images have no source in ${mediaPath}:\n${formatList(missing)}`,
		);
	}

	if (shared.size > 0) {
		throw new Error(
			`${String(shared.size)} image stems name more than one source in ${mediaPath}:\n${formatList([...shared])}`,
		);
	}

	return files;
}

export async function readManifest(statePath: string) {
	return readJsonFile<ImageManifest>(path.join(statePath, imageManifestFile));
}

export async function writeManifest(statePath: string, manifest: ImageManifest) {
	await writeJsonFile(path.join(statePath, imageManifestFile), manifest);
}

export async function readBuildId(outputPath: string) {
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

export async function readConsumedManifest(statePath: string) {
	return readJsonFile<ImageManifest>(path.join(statePath, imageConsumedManifestFile));
}

// On a second run against the same build, the previous manifest stays the grace manifest
export async function readGraceManifest(statePath: string, manifest: ImageManifest) {
	const consumed = await readConsumedManifest(statePath);

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
