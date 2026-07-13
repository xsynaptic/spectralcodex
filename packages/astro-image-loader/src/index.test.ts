import type { LoaderContext } from 'astro/loaders';

import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, test, vi } from 'vitest';

import { defineImageCollection, ImageLoaderBaseSchema, imageLoader } from './index';
import { createMockLoaderContext } from './mock-loader-context';

async function createFixtureDir(files: Array<string>) {
	const dir = await mkdtemp(path.join(tmpdir(), 'image-loader-'));

	for (const file of files) {
		const filePath = path.join(dir, file);

		await mkdir(path.dirname(filePath), { recursive: true });
		// The loader never reads image contents, so plain text stands in for image data
		await writeFile(filePath, `fixture:${file}`);
	}

	// Astro's config.root always carries a trailing slash
	const root = new URL(`${pathToFileURL(dir).href}/`);

	return { dir, root };
}

describe('imageLoader', () => {
	test('rejects unsafe patterns at creation time', () => {
		expect(() => imageLoader({ pattern: '../escape/*.jpg' })).toThrow('cannot start with `../`');
		expect(() => imageLoader({ pattern: ['*.jpg', '/absolute/*.jpg'] })).toThrow(
			'cannot be absolute paths',
		);
	});

	test('warns when the glob matches no files', async () => {
		const { root } = await createFixtureDir(['notes.txt']);
		const { context, logs } = createMockLoaderContext({ root });

		await imageLoader({}).load(context);

		expect(
			logs.some((log) => log.level === 'warn' && log.message.includes('No images found')),
		).toBe(true);
	});

	test('defineImageCollection pairs the loader with a schema', async () => {
		const { root } = await createFixtureDir(['a.jpg']);
		const { context, entries } = createMockLoaderContext({ root });

		const collection = defineImageCollection({});

		expect(collection.schema).toBe(ImageLoaderBaseSchema);

		await collection.loader.load(context);

		const parsed = ImageLoaderBaseSchema.parse(entries.get('a.jpg')?.data);

		expect(parsed.src).toBe('a.jpg');
		expect(parsed.modifiedTime).toBeInstanceOf(Date);
	});

	test('warns and loads nothing when the base directory is missing', async () => {
		const { root } = await createFixtureDir([]);
		const { context, entries, logs } = createMockLoaderContext({ root });

		await imageLoader({ base: 'does-not-exist' }).load(context);

		expect(entries.size).toBe(0);
		expect(logs.some((log) => log.level === 'warn' && log.message.includes('does not exist'))).toBe(
			true,
		);
	});

	test('discovers matching files, ignoring underscore prefixes and other extensions', async () => {
		const { root } = await createFixtureDir(['a.jpg', '_draft.jpg', 'notes.txt', 'nested/b.png']);
		const { context, entries } = createMockLoaderContext({ root });

		await imageLoader({}).load(context);

		expect([...entries.keys()].sort((a, b) => a.localeCompare(b))).toEqual([
			'a.jpg',
			'nested/b.png',
		]);
		expect(entries.get('a.jpg')?.data).toMatchObject({ src: 'a.jpg' });
		expect(entries.get('a.jpg')?.data.modifiedTime).toBeInstanceOf(Date);
	});

	test('uses a custom generateId and merges dataHandler output', async () => {
		const { root } = await createFixtureDir(['a.jpg']);
		const { context, entries } = createMockLoaderContext({ root });

		await imageLoader({
			generateId: ({ filePath }) => filePath.replace(/\.\w+$/, ''),
			dataHandler: ({ filePathRelative }) => ({ title: `Title for ${filePathRelative}` }),
		}).load(context);

		expect(entries.has('a')).toBe(true);
		expect(entries.get('a')?.data.title).toBe('Title for a.jpg');
	});

	test('skips unchanged entries and regenerates on invalidationKey or mtime change', async () => {
		const { dir, root } = await createFixtureDir(['a.jpg', 'b.jpg']);
		const { context } = createMockLoaderContext({ root });

		const dataHandler = vi.fn(() => ({ title: 'x' }));

		await imageLoader({ dataHandler, invalidationKey: 'v1' }).load(context);
		expect(dataHandler).toHaveBeenCalledTimes(2);

		// Unchanged reload: digest matches, dataHandler untouched
		await imageLoader({ dataHandler, invalidationKey: 'v1' }).load(context);
		expect(dataHandler).toHaveBeenCalledTimes(2);

		// Changed invalidation key: everything regenerates
		await imageLoader({ dataHandler, invalidationKey: 'v2' }).load(context);
		expect(dataHandler).toHaveBeenCalledTimes(4);

		// Touched file: only that entry regenerates
		const future = new Date(Date.now() + 5000);

		await utimes(path.join(dir, 'a.jpg'), future, future);
		await imageLoader({ dataHandler, invalidationKey: 'v2' }).load(context);
		expect(dataHandler).toHaveBeenCalledTimes(5);
	});

	test('removes deleted files from the store and reports live paths to afterLoad', async () => {
		const { dir, root } = await createFixtureDir(['a.jpg', 'b.jpg']);
		const { context, entries } = createMockLoaderContext({ root });

		const afterLoad = vi.fn();
		const loader = imageLoader({ afterLoad });

		await loader.load(context);
		expect(entries.size).toBe(2);
		expect(afterLoad).toHaveBeenLastCalledWith({
			filePathsRelative: expect.arrayContaining(['a.jpg', 'b.jpg']) as Array<string>,
		});

		await rm(path.join(dir, 'b.jpg'));
		await loader.load(context);

		expect(entries.has('b.jpg')).toBe(false);
		expect(afterLoad).toHaveBeenLastCalledWith({ filePathsRelative: ['a.jpg'] });
	});

	test('propagates parseData failures with their message intact', async () => {
		const { root } = await createFixtureDir(['a.jpg']);
		const parseData = (() =>
			Promise.reject(new Error('data does not match the collection schema'))) as unknown;
		const { context } = createMockLoaderContext({
			root,
			parseData: parseData as LoaderContext['parseData'],
		});

		await expect(imageLoader({}).load(context)).rejects.toThrow(
			'data does not match the collection schema',
		);
	});

	describe('watch mode', () => {
		test('registers the base directory with the watcher', async () => {
			const { root } = await createFixtureDir(['a.jpg']);
			const { context, watcher } = createMockLoaderContext({ root });

			await imageLoader({}).load(context);

			expect(watcher.add).toHaveBeenCalledTimes(1);
		});

		test('handles add, change, and unlink events with real file mtimes', async () => {
			const { dir, root } = await createFixtureDir(['a.jpg']);
			const { context, entries } = createMockLoaderContext({ root });

			await imageLoader({}).load(context);

			// Added file appears in the store with its actual mtime
			const addedPath = path.join(dir, 'new.jpg');

			await writeFile(addedPath, 'fixture:new.jpg');
			watcherEmit(context, 'add', addedPath);

			await vi.waitFor(() => {
				expect(entries.has('new.jpg')).toBe(true);
			});

			const storedTime = entries.get('new.jpg')?.data.modifiedTime as Date;
			const stats = await stat(addedPath);

			expect(storedTime.getTime()).toBe(stats.mtime.getTime());

			// Deleted file is removed
			watcherEmit(context, 'unlink', addedPath);

			await vi.waitFor(() => {
				expect(entries.has('new.jpg')).toBe(false);
			});
		});

		test('ignores paths that do not match the pattern', async () => {
			const { dir, root } = await createFixtureDir(['a.jpg']);
			const { context, entries } = createMockLoaderContext({ root });

			await imageLoader({}).load(context);

			await writeFile(path.join(dir, 'readme.txt'), 'not an image');
			watcherEmit(context, 'add', path.join(dir, 'readme.txt'));

			await new Promise((resolve) => setTimeout(resolve, 500));

			expect(entries.has('readme.txt')).toBe(false);
			expect(entries.size).toBe(1);
		});

		test('watch batches call afterLoad without live paths', async () => {
			const { dir, root } = await createFixtureDir(['a.jpg']);
			const { context } = createMockLoaderContext({ root });

			const afterLoad = vi.fn();

			await imageLoader({ afterLoad }).load(context);
			expect(afterLoad).toHaveBeenCalledTimes(1);

			const touchedPath = path.join(dir, 'a.jpg');
			const future = new Date(Date.now() + 5000);

			await utimes(touchedPath, future, future);
			watcherEmit(context, 'change', touchedPath);

			await vi.waitFor(() => {
				expect(afterLoad).toHaveBeenCalledTimes(2);
			});
			expect(afterLoad).toHaveBeenLastCalledWith({});
		});
	});
});

function watcherEmit(context: LoaderContext, event: string, filePath: string) {
	(context.watcher as unknown as NodeJS.EventEmitter).emit(event, filePath);
}
