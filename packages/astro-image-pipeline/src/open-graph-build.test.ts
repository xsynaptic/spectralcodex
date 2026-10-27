import { existsSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { OpenGraphCardRenderOptions, OpenGraphCardSource } from '#open-graph-build.ts';
import type { OpenGraphCard } from '#open-graph-cards.ts';

import { resolveImageEncoding } from '#image-encoding.ts';
import {
	getImageCachePaths,
	imageManifestVersion,
	writeBuildId,
	writeManifest,
} from '#image-state.ts';
import { renderOpenGraphCards } from '#open-graph-build.ts';

let root: string;
let mediaPath: string;
let distPath: string;
let directory: string;

const cards: Record<string, OpenGraphCard> = {
	'atlas.jpg': { input: { title: 'Atlas' } },
	'gone.jpg': { image: { id: 'gone.jpg' }, input: { title: 'Gone' } },
	'posts-a.jpg': { image: { id: 'photo.jpg' }, input: { title: 'A' } },
	'posts-b.jpg': { image: { id: 'photo.jpg' }, input: { title: 'B' } },
	'posts-c.jpg': { image: { id: 'photo.jpg', treatment: 'blur' }, input: { title: 'C' } },
};

async function writeBuild() {
	await writeManifest(path.join(root, 'img-state'), {
		buildId: 'build',
		distPath,
		encoding: resolveImageEncoding(),
		limitInputPixels: 268_402_689,
		mediaPath,
		openGraphCards: cards,
		renditions: {},
		version: imageManifestVersion,
	});
	await writeBuildId(distPath, 'build');
}

function createDecode() {
	return vi.fn((source: OpenGraphCardSource) =>
		Promise.resolve(`${source.id}:${source.treatment ?? 'plain'}`),
	);
}

function render(options: Partial<OpenGraphCardRenderOptions<string>> = {}) {
	return renderOpenGraphCards<string>({
		cachePath: root,
		decode: createDecode(),
		onFailure: 'report',
		render: (input, decoded) =>
			Promise.resolve(
				new TextEncoder().encode(`${JSON.stringify(input.title)}|${decoded ?? 'none'}`),
			),
		templateVersion: 'template-1',
		...options,
	});
}

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(tmpdir(), 'open-graph-build-'));
	mediaPath = path.join(root, 'media');
	distPath = path.join(root, 'dist');
	directory = getImageCachePaths(root).openGraphCardsPath;
	await fs.mkdir(mediaPath);
	await fs.mkdir(distPath);
	await sharp({ create: { background: '#336699', channels: 3, height: 40, width: 60 } })
		.jpeg()
		.toFile(path.join(mediaPath, 'photo.jpg'));
	await writeBuild();
});

afterEach(async () => {
	await fs.rm(root, { force: true, recursive: true });
});

describe('renderOpenGraphCards', () => {
	test('decodes once per photo and treatment, and hands each card its own decode', async () => {
		const decode = createDecode();
		const counts = await render({ decode });

		expect(decode).toHaveBeenCalledTimes(2);
		expect(counts).toMatchObject({ rendered: 4, sources: 3, written: 4 });
		expect(await fs.readFile(path.join(directory, 'posts-b.jpg'), 'utf8')).toBe(
			'"B"|photo.jpg:plain',
		);
		expect(await fs.readFile(path.join(directory, 'posts-c.jpg'), 'utf8')).toBe(
			'"C"|photo.jpg:blur',
		);
		expect(await fs.readFile(path.join(directory, 'atlas.jpg'), 'utf8')).toBe('"Atlas"|none');
	});

	test('a missing photo fails only its own cards', async () => {
		const counts = await render();

		expect(counts.failures).toStrictEqual([
			{ message: 'Missing image: gone.jpg', name: 'gone.jpg' },
		]);
		expect(existsSync(path.join(directory, 'gone.jpg'))).toBe(false);
	});

	test('a warm run decodes and renders nothing', async () => {
		await render();

		const decode = createDecode();
		const counts = await render({ decode });

		expect(decode).not.toHaveBeenCalled();
		expect(counts).toMatchObject({ fresh: 4, rendered: 0 });
	});

	test('a new template version renders every card again, and unchanged bytes stay on disk', async () => {
		await render();

		const counts = await render({ templateVersion: 'template-2' });

		expect(counts).toMatchObject({ fresh: 0, rendered: 4, written: 0 });
	});

	test('a replaced photo renders its cards again', async () => {
		await render();
		await sharp({ create: { background: '#993366', channels: 3, height: 40, width: 60 } })
			.jpeg()
			.toFile(path.join(mediaPath, 'photo.jpg'));

		const counts = await render();

		expect(counts).toMatchObject({ fresh: 1, rendered: 3 });
	});
});
