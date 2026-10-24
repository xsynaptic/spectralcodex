import type { ImageManifest, ImagePresetName } from '@spectralcodex/shared/images';
import type { SourceFingerprints } from '@spectralcodex/shared/source-fingerprint';

import {
	getImageDerivative,
	imageBuildIdFile,
	imageManifestFile,
} from '@spectralcodex/shared/images';
import { createSourceFingerprints } from '@spectralcodex/shared/source-fingerprint';
import { existsSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { buildImages } from '#images/images-build.ts';
import { Refusal } from '#shared/cli-command.ts';
import { findWorkspaceRoot, readFileIfExists } from '#shared/utils.ts';

const demoImageId = 'example-folder-1/example-image-1.jpg';
const demoImagePath = path.join(findWorkspaceRoot(), 'packages/content-demo/media', demoImageId);

const allPresets: Array<[ImagePresetName, number]> = [
	['author', 450],
	['author', 600],
	['card', 450],
	['card', 600],
	['card', 900],
	['card-hq', 1200],
	['content', 450],
	['content', 600],
	['content', 900],
	['content', 1200],
	['feed', 900],
	['hero', 1200],
	['popup', 350],
	['popup', 700],
	['search', 64],
	['search', 128],
];

let root: string;
let mediaPath: string;
let derivativesPath: string;
let statePath: string;
let distPath: string;
let fingerprints: SourceFingerprints;
let buildCount = 0;

// Stands in for `astro build`: a manifest in the state directory and its id in `dist/`
async function writeBuild(presets: ReadonlyArray<[ImagePresetName, number]> = allPresets) {
	const { height, width } = await sharp(path.join(mediaPath, demoImageId)).metadata();
	const source = { height, id: demoImageId, width };
	const derivatives = new Map(
		presets.map(([preset, presetWidth]) => {
			const derivative = getImageDerivative(source, preset, presetWidth);

			return [derivative.path, derivative];
		}),
	);
	const manifest: ImageManifest = {
		buildId: `build-${String(++buildCount)}`,
		derivatives: [...derivatives.values()],
		mediaPath,
		sources: {
			[demoImageId]: { height, width },
		},
	};

	await fs.writeFile(path.join(statePath, imageManifestFile), JSON.stringify(manifest));
	await fs.writeFile(path.join(distPath, imageBuildIdFile), manifest.buildId);

	return manifest;
}

function build(options: { isMassPruneAllowed?: boolean } = {}) {
	return buildImages({ derivativesPath, distPath, fingerprints, mediaPath, statePath, ...options });
}

function sortPaths(paths: ReadonlyArray<string>) {
	return paths.toSorted((first, second) => first.localeCompare(second));
}

async function readPurgeQueue() {
	const data = await readFileIfExists(path.join(statePath, 'purge-queue.txt'));

	return sortPaths(data?.toString('utf8').split('\n').filter(Boolean) ?? []);
}

async function listDerivatives() {
	if (!existsSync(derivativesPath)) return [];

	const names = await fs.readdir(derivativesPath, { recursive: true });

	return sortPaths(names.filter((name) => /\.(?:jpg|webp)$/.test(name)));
}

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(tmpdir(), 'images-build-'));
	mediaPath = path.join(root, 'media');
	derivativesPath = path.join(root, 'img');
	statePath = path.join(root, 'img-state');
	distPath = path.join(root, 'dist');
	fingerprints = createSourceFingerprints(root);

	await fs.mkdir(path.join(mediaPath, path.dirname(demoImageId)), { recursive: true });
	await fs.mkdir(statePath);
	await fs.mkdir(distPath);
	await fs.copyFile(demoImagePath, path.join(mediaPath, demoImageId));
});

afterEach(async () => {
	await fs.rm(root, { force: true, recursive: true });
});

describe('buildImages', () => {
	test('every derivative is encoded at the size its name states, with metadata stripped', async () => {
		const manifest = await writeBuild();
		const counts = await build();

		expect(counts.encoded).toBe(manifest.derivatives.length);

		const names = await listDerivatives();

		for (const name of names) {
			const [, width, height, format] = /-(\d+)(?:x(\d+))?\.(jpg|webp)$/.exec(name) ?? [];
			const metadata = await sharp(path.join(derivativesPath, name)).metadata();

			expect(metadata.width).toBe(Number(width));
			if (height) expect(metadata.height).toBe(Number(height));
			expect(metadata.format).toBe(format === 'jpg' ? 'jpeg' : format);
			expect(metadata.exif).toBeUndefined();
		}
	});

	test('a source edit regenerates its derivatives and queues each overwrite for purge', async () => {
		const manifest = await writeBuild();

		await build();

		const sourcePath = path.join(mediaPath, demoImageId);
		const edited = await sharp(sourcePath).modulate({ brightness: 1.2 }).jpeg().toBuffer();

		await fs.writeFile(sourcePath, edited);
		await writeBuild();

		const counts = await build();
		const paths = sortPaths(manifest.derivatives.map((derivative) => derivative.path));

		expect(counts.overwritten).toBe(paths.length);
		expect(await readPurgeQueue()).toEqual(paths);
	});

	test('an identical regeneration leaves the file, its mtime and the purge queue alone', async () => {
		const manifest = await writeBuild();

		await build();

		const past = new Date('2020-01-01');
		const names = await listDerivatives();

		for (const name of names) await fs.utimes(path.join(derivativesPath, name), past, past);
		await fs.rm(path.join(statePath, 'sidecar.json'));

		const counts = await build();

		expect(counts.encoded).toBe(manifest.derivatives.length);
		expect(counts.written).toBe(0);
		expect(await readPurgeQueue()).toEqual([]);

		for (const name of names) {
			const stats = await fs.stat(path.join(derivativesPath, name));

			expect(stats.mtimeMs).toBe(past.getTime());
		}
	});

	test('a second run against an unchanged build encodes nothing', async () => {
		await writeBuild();
		await build();

		const counts = await build();

		expect(counts.encoded).toBe(0);
	});

	test('an interrupted run resumes without re-encoding finished derivatives', async () => {
		const manifest = await writeBuild();
		const controller = new AbortController();

		await expect(
			buildImages({
				derivativesPath,
				distPath,
				fingerprints,
				mediaPath,
				onProgress: () => {
					controller.abort();
				},
				signal: controller.signal,
				statePath,
			}),
		).rejects.toThrow();

		const { length: finished } = await listDerivatives();

		expect(finished).toBeGreaterThan(0);
		expect(finished).toBeLessThan(manifest.derivatives.length);

		const counts = await build();

		expect(counts.fresh).toBe(finished);
		expect(counts.encoded).toBe(manifest.derivatives.length - finished);
	});

	test('an unchanged mtime and size skip hashing; a touch re-hashes without re-encoding', async () => {
		const sourcePath = path.join(mediaPath, demoImageId);
		const mtime = new Date('2024-01-01T00:00:00Z');

		await fs.utimes(sourcePath, mtime, mtime);
		await writeBuild();
		await build();

		const original = await fs.readFile(sourcePath);
		const flipped = Buffer.from(original);
		const middle = Math.floor(flipped.length / 2);

		flipped[middle] = (flipped[middle] ?? 0) ^ 0xff;
		await fs.writeFile(sourcePath, flipped);
		await fs.utimes(sourcePath, mtime, mtime);

		const trusted = await build();

		expect(trusted.encoded).toBe(0);

		const touched = new Date(mtime.getTime() + 60_000);

		await fs.writeFile(sourcePath, original);
		await fs.utimes(sourcePath, touched, touched);

		const rehashed = await build();

		expect(rehashed.encoded).toBe(0);
	});

	test('a change of sharp build is reported by the first run to complete', async () => {
		await writeBuild();
		await build();

		const controller = new AbortController();

		await fs.writeFile(path.join(statePath, 'engine.txt'), 'other\n');
		await expect(
			buildImages({
				derivativesPath,
				distPath,
				fingerprints,
				mediaPath,
				onProgress: () => {
					controller.abort();
				},
				signal: controller.signal,
				statePath,
			}),
		).rejects.toThrow();

		const changed = await build();
		const settled = await build();

		expect(changed.isEngineChanged).toBe(true);
		expect(settled.isEngineChanged).toBe(false);
	});
});

describe('buildImages pruning', () => {
	test('a derivative survives one build after leaving the manifest, then goes', async () => {
		await writeBuild();
		await build();

		const dropped = await listDerivatives();

		await writeBuild([['card', 450]]);
		await build();
		await build();

		expect(await listDerivatives()).toEqual(dropped);

		await writeBuild([['card', 450]]);

		const counts = await build();

		expect(counts.pruned).toBe(dropped.length - 1);
		expect(await listDerivatives()).toHaveLength(1);
	});

	test('a mass prune is refused unless allowed', async () => {
		await writeBuild();

		const strayDirectory = path.join(derivativesPath, 'stray');

		await fs.mkdir(strayDirectory, { recursive: true });

		for (let index = 0; index < 101; index++) {
			await fs.writeFile(path.join(strayDirectory, `stray-${String(index)}.webp`), 'stray');
		}

		await expect(build()).rejects.toThrow(/Refusing to prune 101/);
		expect(await listDerivatives()).toHaveLength(101);

		const counts = await build({ isMassPruneAllowed: true });

		expect(counts.pruned).toBe(101);
	});
});

describe('buildImages guards', () => {
	test('refuses a manifest from another build than dist', async () => {
		await writeBuild();
		await fs.writeFile(path.join(distPath, imageBuildIdFile), 'another-build');

		await expect(build()).rejects.toThrow(Refusal);
		expect(await listDerivatives()).toEqual([]);
	});

	test('refuses a manifest built from another media root', async () => {
		await writeBuild();

		await expect(
			buildImages({
				derivativesPath,
				distPath,
				fingerprints,
				mediaPath: path.join(root, 'other'),
				statePath,
			}),
		).rejects.toThrow(/not the configured/);
	});

	test('refuses when a source changed size or vanished after the build', async () => {
		await writeBuild();

		const sourcePath = path.join(mediaPath, demoImageId);
		const smaller = await sharp(sourcePath).resize({ width: 1000 }).jpeg().toBuffer();

		await fs.writeFile(sourcePath, smaller);

		await expect(build()).rejects.toThrow(/changed size or vanished/);

		await fs.rm(sourcePath);

		await expect(build()).rejects.toThrow(/changed size or vanished/);
		expect(await listDerivatives()).toEqual([]);
	});
});
