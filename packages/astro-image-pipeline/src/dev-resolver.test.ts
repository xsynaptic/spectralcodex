import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ImageSourceResolver } from '#image-sources.ts';

import { createDevImageResolver } from '#dev-resolver.ts';
import { resolveImageEncoding } from '#image-encoding.ts';
import { renderImage } from '#image-render.ts';
import { createDirectorySources } from '#image-sources.ts';

let rootPath: string;
let mediaPath: string;

function createResolver(builtPath?: string, sources = createDirectorySources(mediaPath)) {
	const render = vi.fn(renderImage);
	const getDevImage = createDevImageResolver({
		builtPath,
		cachePath: path.join(rootPath, 'cache'),
		encoding: resolveImageEncoding(),
		limitInputPixels: 268_402_689,
		mediaPath,
		render,
		sources,
	});

	return { getDevImage, render };
}

beforeEach(async () => {
	rootPath = mkdtempSync(path.join(os.tmpdir(), 'image-dev-test-'));
	mediaPath = path.join(rootPath, 'media');
	mkdirSync(path.join(mediaPath, 'a'), { recursive: true });

	await sharp({ create: { background: '#808080', channels: 3, height: 800, width: 1200 } })
		.jpeg()
		.toFile(path.join(mediaPath, 'a/b-1.jpg'));
});

afterEach(() => {
	rmSync(rootPath, { force: true, recursive: true });
});

describe('createDevImageResolver', () => {
	test('two concurrent requests for one file share a single encode', async () => {
		const { getDevImage, render } = createResolver();

		const [first, second] = await Promise.all([
			getDevImage('a/b-1-450.jpg'),
			getDevImage('a/b-1-450.jpg'),
		]);

		expect(first).toBe(second);
		expect(render).toHaveBeenCalledOnce();
		expect(await sharp(first).metadata()).toMatchObject({ height: 300, width: 450 });
	});

	test('a name outside the grammar or larger than its source is not rendered', async () => {
		const { getDevImage, render } = createResolver();

		expect(await getDevImage('a/b-1-450.png')).toBeUndefined();
		expect(await getDevImage('a/b-1-1800.jpg')).toBeUndefined();
		expect(await getDevImage('a/b-1-1200x900.webp')).toBeUndefined();
		expect(await getDevImage('a/missing-450.jpg')).toBeUndefined();
		expect(await getDevImage('../media/a/b-1-450.jpg')).toBeUndefined();
		expect(render).not.toHaveBeenCalled();
	});

	test('a sidecar sharing the stem is never taken for the source', async () => {
		writeFileSync(path.join(mediaPath, 'a/b-1.aae'), '<plist/>');

		const { getDevImage, render } = createResolver();

		expect(await getDevImage('a/b-1-450.jpg')).toBe(path.join(rootPath, 'cache/a/b-1-450.jpg'));
		expect(render).toHaveBeenCalledWith(path.join(mediaPath, 'a/b-1.jpg'), expect.anything());
	});

	test('a source added after the resolver started is found', async () => {
		const { getDevImage } = createResolver();

		expect(await getDevImage('a/c-1-450.jpg')).toBeUndefined();

		await sharp(path.join(mediaPath, 'a/b-1.jpg')).toFile(path.join(mediaPath, 'a/c-1.jpg'));

		expect(await getDevImage('a/c-1-450.jpg')).toBe(path.join(rootPath, 'cache/a/c-1-450.jpg'));
	});

	test('a source resolved outside the media folder is not rendered', async () => {
		const sources: ImageSourceResolver = { resolve: () => Promise.resolve('../outside.jpg') };

		writeFileSync(path.join(rootPath, 'outside.jpg'), '');

		const { getDevImage, render } = createResolver(undefined, sources);

		expect(await getDevImage('a/b-1-450.jpg')).toBeUndefined();
		expect(render).not.toHaveBeenCalled();
	});

	test('a source edited after its render is rendered again', async () => {
		const { getDevImage, render } = createResolver();
		const target = await getDevImage('a/b-1-350x233.webp');

		await getDevImage('a/b-1-350x233.webp');
		expect(render).toHaveBeenCalledOnce();

		const later = new Date(Date.now() + 60_000);

		utimesSync(path.join(mediaPath, 'a/b-1.jpg'), later, later);

		expect(await getDevImage('a/b-1-350x233.webp')).toBe(target);
		expect(render).toHaveBeenCalledTimes(2);
	});

	test('a file the render already built is served as is', async () => {
		const builtPath = path.join(rootPath, 'img');
		const built = path.join(builtPath, 'a/b-1-450.jpg');

		mkdirSync(path.dirname(built), { recursive: true });
		writeFileSync(built, 'built');

		const { getDevImage, render } = createResolver(builtPath);

		expect(await getDevImage('a/b-1-450.jpg')).toBe(built);
		expect(render).not.toHaveBeenCalled();
	});

	test('a built file older than its source is rendered into the dev cache instead', async () => {
		const builtPath = path.join(rootPath, 'img');
		const built = path.join(builtPath, 'a/b-1-450.jpg');
		const earlier = new Date(Date.now() - 60_000);

		mkdirSync(path.dirname(built), { recursive: true });
		writeFileSync(built, 'built');
		utimesSync(built, earlier, earlier);

		const { getDevImage, render } = createResolver(builtPath);

		expect(await getDevImage('a/b-1-450.jpg')).toBe(path.join(rootPath, 'cache/a/b-1-450.jpg'));
		expect(render).toHaveBeenCalledOnce();
	});
});
