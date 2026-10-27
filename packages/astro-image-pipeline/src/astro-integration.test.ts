import type { AstroIntegration, AstroIntegrationLogger } from 'astro';

import { existsSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import imagePipeline from '#astro-integration.ts';
import { resolveImageEncoding } from '#image-encoding.ts';
import { defineImagePipeline } from '#image-presets.ts';
import { imageRecordsVariable } from '#image-recorder.ts';
import { readManifest } from '#image-state.ts';
import { defineOpenGraphCards } from '#open-graph-cards.ts';

type Hooks = AstroIntegration['hooks'];

const pipeline = defineImagePipeline({
	presets: { card: { aspectRatio: 3 / 2, fit: 'cover', format: 'webp', widths: [600] } },
});

const openGraphCards = defineOpenGraphCards({ format: 'jpg' });

let root: string;

function createLogger() {
	return { info: vi.fn(), warn: vi.fn() } as unknown as AstroIntegrationLogger;
}

function createIntegration() {
	return imagePipeline({
		baseUrl: '/img',
		cachePath: root,
		mediaPath: path.join(root, 'media'),
		pipeline,
	});
}

async function startBuild(hooks: Hooks, { isIncremental = false } = {}) {
	await hooks['astro:config:setup']?.({
		command: 'build',
		config: { experimental: { incrementalBuild: isIncremental } },
	} as unknown as Parameters<NonNullable<Hooks['astro:config:setup']>>[0]);
}

async function finishBuild(hooks: Hooks, pageCount = 1) {
	await hooks['astro:build:done']?.({
		dir: pathToFileURL(`${path.join(root, 'dist')}/`),
		logger: createLogger(),
		pages: Array.from({ length: pageCount }, () => ({ pathname: '/' })),
	} as unknown as Parameters<NonNullable<Hooks['astro:build:done']>>[0]);
}

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(tmpdir(), 'image-integration-'));
	await fs.mkdir(path.join(root, 'dist'));
});

afterEach(async () => {
	Reflect.deleteProperty(process.env, imageRecordsVariable);
	await fs.rm(root, { force: true, recursive: true });
});

describe('imagePipeline', () => {
	test.each(['/', '//', ''])('refuses %j as a base URL', (baseUrl) => {
		expect(() =>
			imagePipeline({
				baseUrl,
				cachePath: 'cache',
				mediaPath: 'media',
				pipeline: { encoding: resolveImageEncoding() },
			}),
		).toThrow('below the site root');
	});
});

describe('imagePipeline recording', () => {
	test('names built during the build become the manifest, mapped to their sources', async () => {
		const { hooks } = createIntegration();

		await startBuild(hooks);
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);
		pipeline.getName(
			{ height: 1000, id: 'c.jpg', path: 'elsewhere/c.jpg', width: 1500 },
			'card',
			600,
		);
		await finishBuild(hooks);

		const manifest = await readManifest(path.join(root, 'img-state'));

		expect(manifest?.files).toStrictEqual({
			'a/b-600x400.webp': 'a/b.jpg',
			'c-600x400.webp': 'elsewhere/c.jpg',
		});
		expect(process.env[imageRecordsVariable]).toBeUndefined();
	});

	test('a name recorded from two sources fails the build', async () => {
		const { hooks } = createIntegration();

		await startBuild(hooks);
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);
		pipeline.getName({ height: 1000, id: 'a/b.png', width: 1500 }, 'card', 600);

		await expect(finishBuild(hooks)).rejects.toThrow(/recorded from more than one source/);
	});

	test('pages built with nothing recorded fail the build', async () => {
		const { hooks } = createIntegration();

		await startBuild(hooks);

		await expect(finishBuild(hooks)).rejects.toThrow(/No image names were recorded/);
		expect(existsSync(path.join(root, 'img-state/manifest.json'))).toBe(false);
	});

	test('an incremental build that renders no page keeps the previous names', async () => {
		const full = createIntegration();

		await startBuild(full.hooks);
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);
		await finishBuild(full.hooks);

		const incremental = createIntegration();

		await startBuild(incremental.hooks, { isIncremental: true });
		await finishBuild(incremental.hooks);

		const manifest = await readManifest(path.join(root, 'img-state'));

		expect(manifest?.files).toStrictEqual({ 'a/b-600x400.webp': 'a/b.jpg' });
	});

	test('a second build in the same process records its own names', async () => {
		const first = createIntegration();

		await startBuild(first.hooks);
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);
		await finishBuild(first.hooks);

		const second = createIntegration();

		await startBuild(second.hooks);
		pipeline.getName({ height: 1000, id: 'c.jpg', width: 1500 }, 'card', 600);
		await finishBuild(second.hooks);

		const manifest = await readManifest(path.join(root, 'img-state'));

		expect(manifest?.files).toStrictEqual({ 'c-600x400.webp': 'c.jpg' });
	});

	test('nothing is recorded outside a build', () => {
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);

		expect(existsSync(path.join(root, 'img-state/records'))).toBe(false);
	});
});

describe('imagePipeline OpenGraph card recording', () => {
	test('the same card recorded with keys in another order is one card, stored canonically', async () => {
		const { hooks } = createIntegration();

		await startBuild(hooks);
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);
		openGraphCards.getCardName({
			id: 'posts-a',
			image: { id: 'a/b.jpg' },
			input: Object.fromEntries([
				['title', 'A'],
				['collection', 'posts'],
				['titleZh', undefined],
			]),
		});
		openGraphCards.getCardName({
			id: 'posts-a',
			image: { id: 'a/b.jpg' },
			input: { collection: 'posts', title: 'A' },
		});
		await finishBuild(hooks);

		const manifest = await readManifest(path.join(root, 'img-state'));
		const card = manifest?.openGraphCards['posts-a.jpg'];

		expect(card).toStrictEqual({
			image: { id: 'a/b.jpg' },
			input: { collection: 'posts', title: 'A' },
		});
		expect(Object.keys(card?.input ?? {})).toStrictEqual(['collection', 'title']);
	});

	test('one card name recorded with different input fails the build', async () => {
		const { hooks } = createIntegration();

		await startBuild(hooks);
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);
		openGraphCards.getCardName({ id: 'posts-a', input: { title: 'A' } });
		openGraphCards.getCardName({ id: 'posts-a', input: { title: 'B' } });

		await expect(finishBuild(hooks)).rejects.toThrow(
			/1 OpenGraph cards were recorded with different input/,
		);
	});

	test('one card name recorded with a different treatment fails the build', async () => {
		const { hooks } = createIntegration();

		await startBuild(hooks);
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);
		openGraphCards.getCardName({ id: 'posts-a', image: { id: 'a/b.jpg' }, input: { title: 'A' } });
		openGraphCards.getCardName({
			id: 'posts-a',
			image: { id: 'a/b.jpg', treatment: 'blur' },
			input: { title: 'A' },
		});

		await expect(finishBuild(hooks)).rejects.toThrow(/recorded with different input/);
	});

	test('an incremental build keeps the previous cards beside the ones it records', async () => {
		const full = createIntegration();

		await startBuild(full.hooks);
		pipeline.getName({ height: 1000, id: 'a/b.jpg', width: 1500 }, 'card', 600);
		openGraphCards.getCardName({ id: 'posts-a', input: { title: 'A' } });
		await finishBuild(full.hooks);

		const incremental = createIntegration();

		await startBuild(incremental.hooks, { isIncremental: true });
		openGraphCards.getCardName({ id: 'posts-b', input: { title: 'B' } });
		await finishBuild(incremental.hooks);

		const manifest = await readManifest(path.join(root, 'img-state'));

		expect(manifest?.openGraphCards).toStrictEqual({
			'posts-a.jpg': { input: { title: 'A' } },
			'posts-b.jpg': { input: { title: 'B' } },
		});
	});
});
