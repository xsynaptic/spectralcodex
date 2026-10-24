import { renderImage } from '@spectralcodex/scripts/images-render';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createDevImageResolver } from '#dev/image/image-resolver.ts';

let rootPath: string;
let mediaPath: string;

function createResolver(builtPath?: string) {
	const render = vi.fn(renderImage);
	const getDevImage = createDevImageResolver({
		builtPath,
		cachePath: path.join(rootPath, 'cache'),
		mediaPath,
		render,
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

	test('a name no preset gives the source is not rendered', async () => {
		const { getDevImage, render } = createResolver();

		expect(await getDevImage('a/b-1-500.jpg')).toBeUndefined();
		expect(await getDevImage('a/b-1-1800.jpg')).toBeUndefined();
		expect(await getDevImage('a/missing-450.jpg')).toBeUndefined();
		expect(await getDevImage('../media/a/b-1-450.jpg')).toBeUndefined();
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

	test('a file pnpm render-images built is served as is', async () => {
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
