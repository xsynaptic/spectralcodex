import { spawnSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { ImageRenderOptions } from '#image-build.ts';
import type { ImageManifest } from '#image-state.ts';

import { readFileIfExists } from '#files.ts';
import { getRenditionKey, renderImages } from '#image-build.ts';
import { resolveImageEncoding } from '#image-encoding.ts';
import { imageManifestVersion, writeBuildId, writeManifest } from '#image-state.ts';
import { Refusal } from '#refusal.ts';

const sourceId = 'gallery/source-1.jpg';
const stem = 'gallery/source-1';

const allSizes = [
	'450.webp',
	'600.webp',
	'450x300.webp',
	'600x400.webp',
	'900x600.webp',
	'1200x800.jpg',
	'450.jpg',
	'600.jpg',
	'900.jpg',
	'1200.jpg',
	'900x600.jpg',
	'1200x800.webp',
	'350x233.webp',
	'700x467.webp',
	'64x48.webp',
	'128x96.webp',
];

let root: string;
let mediaPath: string;
let renditionsPath: string;
let statePath: string;
let distPath: string;
let buildCount = 0;

function getNames(sizes: ReadonlyArray<string>) {
	return sizes.map((size) => `${stem}-${size}`);
}

async function writeBuild(
	sizes: ReadonlyArray<string> = allSizes,
	{ limitInputPixels = 268_402_689 } = {},
) {
	const names = getNames(sizes);
	const manifest = {
		buildId: `build-${String(++buildCount)}`,
		distPath,
		encoding: resolveImageEncoding({ jpg: { quality: 85 }, webp: { quality: 70 } }),
		files: Object.fromEntries(names.map((name) => [name, sourceId])),
		limitInputPixels,
		mediaPath,
		version: imageManifestVersion,
	} satisfies ImageManifest;

	await writeManifest(statePath, manifest);
	await writeBuildId(distPath, manifest.buildId);

	return names;
}

async function writeSource(width: number, height: number) {
	await sharp({
		create: { background: '#336699', channels: 3, height, width },
	})
		.composite([
			{
				input: { create: { background: '#cc9933', channels: 3, height: 100, width: 100 } },
				left: 40,
				top: 40,
			},
		])
		.withExif({ IFD0: { Copyright: 'source' } })
		.jpeg()
		.toFile(path.join(mediaPath, sourceId));
}

function render(options: Omit<ImageRenderOptions, 'cachePath'> = {}) {
	return renderImages({ cachePath: root, ...options });
}

function sortNames(names: ReadonlyArray<string>) {
	return names.toSorted((first, second) => first.localeCompare(second));
}

async function listFiles() {
	if (!existsSync(renditionsPath)) return [];

	const names = await fs.readdir(renditionsPath, { recursive: true });

	return sortNames(names.filter((name) => /\.(?:jpg|webp)$/.test(name)));
}

function getDeadPid() {
	return spawnSync(process.execPath, ['--eval', '']).pid;
}

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(tmpdir(), 'image-build-'));
	mediaPath = path.join(root, 'media');
	renditionsPath = path.join(root, 'img');
	statePath = path.join(root, 'img-state');
	distPath = path.join(root, 'dist');

	await fs.mkdir(path.join(mediaPath, path.dirname(sourceId)), { recursive: true });
	await fs.mkdir(statePath);
	await fs.mkdir(distPath);
	await writeSource(1500, 1000);
});

afterEach(async () => {
	await fs.rm(root, { force: true, recursive: true });
});

describe('renderImages', () => {
	test('every file is rendered at the size its name states, with metadata stripped', async () => {
		const names = await writeBuild();
		const counts = await render();

		expect(counts.rendered).toBe(names.length);

		const files = await listFiles();

		for (const name of files) {
			const [, width, height, format] = /-(\d+)(?:x(\d+))?\.(jpg|webp)$/.exec(name) ?? [];
			const metadata = await sharp(path.join(renditionsPath, name)).metadata();

			expect(metadata.width).toBe(Number(width));
			if (height) expect(metadata.height).toBe(Number(height));
			expect(metadata.format).toBe(format === 'jpg' ? 'jpeg' : format);
			expect(metadata.exif).toBeUndefined();
		}
	});

	test('a source edit regenerates its files and hands each overwrite to the caller', async () => {
		const names = await writeBuild();

		await render();

		const sourcePath = path.join(mediaPath, sourceId);
		const edited = await sharp(sourcePath).modulate({ brightness: 1.2 }).jpeg().toBuffer();
		const replaced: Array<string> = [];

		await fs.writeFile(sourcePath, edited);
		await writeBuild();

		const counts = await render({
			onReplace: (name) => {
				replaced.push(name);

				return Promise.resolve();
			},
		});

		expect(counts.overwritten).toBe(names.length);
		expect(sortNames(replaced)).toEqual(sortNames(names));
	});

	test('an identical regeneration leaves the file and its mtime alone', async () => {
		const names = await writeBuild();

		await render();

		const past = new Date('2020-01-01');
		const files = await listFiles();

		for (const name of files) await fs.utimes(path.join(renditionsPath, name), past, past);
		await fs.rm(path.join(statePath, 'sidecar.json'));

		const counts = await render();

		expect(counts.rendered).toBe(names.length);
		expect(counts.written).toBe(0);
		expect(counts.overwritten).toBe(0);

		for (const name of files) {
			const stats = await fs.stat(path.join(renditionsPath, name));

			expect(stats.mtimeMs).toBe(past.getTime());
		}
	});

	test('an interrupted run resumes without re-encoding finished files', async () => {
		const names = await writeBuild();
		const controller = new AbortController();

		await expect(
			renderImages({
				cachePath: root,
				onProgress: () => {
					controller.abort();
				},
				signal: controller.signal,
			}),
		).rejects.toThrow();

		const { length: finished } = await listFiles();

		expect(finished).toBeGreaterThan(0);
		expect(finished).toBeLessThan(names.length);

		const counts = await render();

		expect(counts.fresh).toBe(finished);
		expect(counts.rendered).toBe(names.length - finished);
	});

	test('a touched source with unchanged bytes re-encodes nothing', async () => {
		const sourcePath = path.join(mediaPath, sourceId);
		const touched = new Date(Date.now() + 60_000);

		await writeBuild();
		await render();
		await fs.utimes(sourcePath, touched, touched);

		const counts = await render();

		expect(counts.rendered).toBe(0);
	});

	test('a change of sharp build is reported by the first run to complete', async () => {
		await writeBuild();
		await render();

		const controller = new AbortController();

		await fs.writeFile(path.join(statePath, 'engine.txt'), 'other\n');
		await expect(
			renderImages({
				cachePath: root,
				onProgress: () => {
					controller.abort();
				},
				signal: controller.signal,
			}),
		).rejects.toThrow();

		const changed = await render();
		const settled = await render();

		expect(changed.isEngineChanged).toBe(true);
		expect(settled.isEngineChanged).toBe(false);
	});
});

// A new key re-renders the whole library (about an hour), so this only changes on purpose
describe('getRenditionKey', () => {
	test('stays pinned for a fixed input', () => {
		const key = getRenditionKey({
			digest: 'a'.repeat(64),
			encoding: resolveImageEncoding({ jpg: { quality: 85 } }).jpg,
			engine: 'engine',
			format: 'jpg',
			height: 800,
			width: 1200,
		});

		expect(key).toBe('9544a2e15263848d');
	});
});

describe('renderImages failure policy', () => {
	test('a source over the pixel limit fails the run without writing a file', async () => {
		await writeBuild(allSizes, { limitInputPixels: 1_000_000 });

		await expect(render()).rejects.toThrow(/16 files failed to render:\n.+exceeds pixel limit/);
		expect(await listFiles()).toEqual([]);
	});
});

describe('renderImages guards', () => {
	test('refuses a manifest from before the current version', async () => {
		await writeBuild();
		await fs.writeFile(
			path.join(statePath, 'manifest.json'),
			JSON.stringify({ buildId: 'old', files: {} }),
		);

		await expect(render()).rejects.toThrow(/version 1, not 2; rebuild first/);
	});

	test('refuses a manifest from another build than dist', async () => {
		await writeBuild();
		await writeBuildId(distPath, 'another-build');

		await expect(render()).rejects.toThrow(Refusal);
		expect(await listFiles()).toEqual([]);
	});

	test('refuses a name larger than its source, so a shrunk source never upscales', async () => {
		await writeBuild();
		await writeSource(1000, 667);

		await expect(render()).rejects.toThrow(/larger than their source/);
		expect(await listFiles()).toEqual([]);
	});

	test('refuses when a source vanished after the build', async () => {
		await writeBuild();
		await fs.rm(path.join(mediaPath, sourceId));

		await expect(render()).rejects.toThrow(/vanished/);
		expect(await listFiles()).toEqual([]);
	});

	test('refuses while a live process holds the lock, and leaves its lock in place', async () => {
		const lockPath = path.join(statePath, 'render.lock');

		await writeBuild();
		await fs.writeFile(lockPath, String(process.pid));

		await expect(render()).rejects.toThrow(`pid ${String(process.pid)}`);

		const lock = await readFileIfExists(lockPath);

		expect(lock?.toString('utf8')).toBe(String(process.pid));
	});

	test('takes over a lock whose holder is dead, then releases it', async () => {
		const lockPath = path.join(statePath, 'render.lock');

		await writeBuild();
		await fs.writeFile(lockPath, String(getDeadPid()));

		const counts = await render();

		expect(counts.rendered).toBe(allSizes.length);
		expect(existsSync(lockPath)).toBe(false);
	});
});
