import type { Loader, LoaderContext } from 'astro/loaders';

import { AstroError } from 'astro/errors';
import { existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';
import picomatch from 'picomatch';
import { glob } from 'tinyglobby';
import { z } from 'zod';

import type { ImageLoaderCache, ImageLoaderOptions } from './types';

import { createChangeQueue } from './change-queue';
import { createJsonlCache } from './jsonl-cache';
import { VALID_INPUT_FORMATS } from './types';

export type { ImageLoaderCache, ImageLoaderCacheValue, ImageLoaderOptions } from './types';

export { createJsonlCache } from './jsonl-cache';

const defaultPatternFormats = VALID_INPUT_FORMATS.filter((format) => format !== 'svg');

const defaultOptions = {
	base: '.',
	pattern: `**/*.{${defaultPatternFormats.join(',')}}`,
	concurrency: 50,
	debounceMs: 300,
	generateId: ({ filePath }) => filePath,
} as const satisfies ImageLoaderOptions;

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function getSyncDataFunction({
	baseDir,
	options,
	cache,
	store,
	parseData,
	generateDigest,
	logger,
}: Pick<LoaderContext, 'store' | 'parseData' | 'generateDigest' | 'logger'> & {
	baseDir: URL;
	options: ImageLoaderOptions;
	cache?: ImageLoaderCache | undefined;
}) {
	// Limit the concurrency of files processed to reduce memory usage
	const limit = pLimit(options.concurrency);

	return async function syncData({ id, filePath }: { id: string; filePath: string }) {
		return limit(async () => {
			// A file URL used for file operations in the data handler
			const fileUrl = new URL(encodeURI(filePath), baseDir);

			let modifiedTime: Date;

			try {
				const stats = await stat(fileURLToPath(fileUrl));

				modifiedTime = stats.mtime;
			} catch {
				logger.warn(`Could not read file stats for ${filePath}; skipping`);
				return;
			}

			// If any of these props change an entry will be regenerated
			const digest = generateDigest({
				id,
				filePath,
				mtime: modifiedTime,
				base: options.base,
				invalidationKey: options.invalidationKey,
			});

			// If the data entry is already in the store and seems current, skip further processing
			// The store is keyed by id, not filePath
			const existingEntry = store.get(id);

			if (existingEntry?.digest === digest && existingEntry.filePath) {
				// Asset imports from image() schema fields are only registered by store.set on fresh writes
				// Re-register on the skip path or those fields lose their Vite modules on incremental builds
				if (existingEntry.assetImports?.length) {
					// @ts-expect-error -- addAssetImports exists at runtime but isn't typed on DataStore
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- see the @ts-expect-error above
					store.addAssetImports(existingEntry.assetImports, existingEntry.filePath);
				}
				return;
			}

			// Relative to the project root, where is this image found; it needs to be importable
			const filePathRelative = path.join(options.base, filePath);

			let handlerData: Record<string, unknown> = {};

			if (options.dataHandler) {
				const cached = await cache?.get(filePathRelative);

				if (cached?.digest === digest) {
					handlerData = cached.data;
				} else {
					handlerData = await options.dataHandler({
						id,
						filePath,
						filePathRelative,
						fileUrl,
						modifiedTime,
						logger,
					});

					await cache?.set(filePathRelative, { digest, data: handlerData });
				}
			}

			// parseData throws a well-formatted AstroError on schema validation failure
			const parsedData = await parseData({
				id,
				filePath,
				data: {
					src: filePathRelative,
					modifiedTime,
					...handlerData,
				},
			});

			store.set({
				id,
				filePath,
				digest,
				data: parsedData,
			});
		});
	};
}

// Only return the relative path if it matches what we're watching
function getFilePathMatchesFunction(pattern: string | Array<string>, baseDir: URL) {
	const isMatch = picomatch(pattern);

	const basePath = fileURLToPath(baseDir);

	return function filePathMatches(changedPath: string) {
		const pathRelative = path.relative(basePath, changedPath);
		const filePath = pathRelative.split(path.sep).join('/');

		if (!filePath.startsWith('../') && isMatch(filePath)) return filePath;
		return;
	};
}

export function imageLoader(optionsPartial: Partial<ImageLoaderOptions>) {
	const options = {
		...defaultOptions,
		...optionsPartial,
	} satisfies ImageLoaderOptions;

	const patterns = Array.isArray(options.pattern) ? options.pattern : [options.pattern];

	if (patterns.some((pattern) => pattern.startsWith('../'))) {
		throw new AstroError(
			'Image loader glob patterns cannot start with `../`.',
			'Set the `base` option to a parent directory instead.',
		);
	}

	if (patterns.some((pattern) => pattern.startsWith('/'))) {
		throw new AstroError(
			'Image loader glob patterns cannot be absolute paths.',
			'Set the `base` option to a parent directory and use a relative pattern instead.',
		);
	}

	return {
		name: '@spectralcodex/astro-image-loader',
		load: async function load(context: LoaderContext): Promise<void> {
			// eslint-disable-next-line @typescript-eslint/unbound-method -- Astro's LoaderContext is meant to be destructured
			const { collection, config, store, parseData, generateDigest, logger, watcher } = context;

			let cache: ImageLoaderCache | undefined;

			if (options.cache) {
				cache = options.cache;
			} else if (options.cache !== false && options.dataHandler) {
				cache = createJsonlCache({
					filePath: fileURLToPath(
						new URL(`astro-image-loader/${collection}.jsonl`, config.cacheDir),
					),
				});
			}

			const baseDir = new URL(options.base, config.root);

			if (!baseDir.pathname.endsWith('/')) {
				baseDir.pathname = `${baseDir.pathname}/`;
			}

			const baseDirPath = fileURLToPath(baseDir);

			// Check if the base directory exists
			if (!existsSync(baseDirPath)) {
				logger.warn(`Image directory "${options.base}" does not exist. No images will be loaded.`);
				return;
			}

			const filePaths = await glob(options.pattern, {
				cwd: baseDirPath,
				expandDirectories: false,
			});

			if (filePaths.length === 0) {
				logger.warn(`No images found matching "${patterns.join(', ')}" in "${options.base}"`);
			} else {
				logger.info(`Syncing ${String(filePaths.length)} images`);
			}

			// Keep track of entries that are no longer present (*e.g.* deleted)
			const untouchedEntries = new Set(store.keys());

			// Generate the data sync function; this is mostly for code readability
			const syncData = getSyncDataFunction({
				baseDir,
				options,
				cache,
				store,
				parseData,
				generateDigest,
				logger,
			});

			// Run the before load hook
			await options.beforeLoad?.();

			// Loop through glob results and generate metadata as needed
			await Promise.all(
				filePaths.map((filePath) => {
					const id = options.generateId({ filePath, base: baseDir });

					// This entry will be synced; don't remove it later on
					untouchedEntries.delete(id);

					return syncData({ id, filePath });
				}),
			);

			// Remove entries that were not found this time; they were presumably deleted
			for (const id of untouchedEntries) {
				store.delete(id);
			}

			// Evict cache rows for deleted or renamed files
			await cache?.prune?.(filePaths.map((filePath) => path.join(options.base, filePath)));

			// Run the after load hook
			await options.afterLoad?.();

			if (!watcher) return;

			// The base directory may sit outside the default watch root
			watcher.add(baseDirPath);

			const filePathMatches = getFilePathMatchesFunction(options.pattern, baseDir);

			const changeQueue = createChangeQueue({
				debounceMs: options.debounceMs,
				processChange: async (change) => {
					if (change.type === 'unlink') {
						store.delete(change.id);
						logger.info(`Deleted from store: ${change.filePath}`);
						return;
					}
					await syncData({ id: change.id, filePath: change.filePath });
					logger.info(`Reloaded data from ${change.filePath}`);
				},
				onBatchStart: async () => {
					await options.beforeLoad?.();
				},
				onBatchEnd: async () => {
					await options.afterLoad?.();
				},
				onError: (error, change) => {
					if (change) {
						logger.error(
							`Error processing ${change.type} for ${change.filePath}: ${getErrorMessage(error)}`,
						);
					} else {
						logger.error(`Error processing image changes: ${getErrorMessage(error)}`);
					}
				},
			});

			function queueChange(changedPath: string, type: 'change' | 'add' | 'unlink') {
				const filePath = filePathMatches(changedPath);

				if (!filePath) return;

				const id = options.generateId({ filePath, base: baseDir });

				changeQueue.add({ filePath, id, type });
			}

			watcher.on('change', (changedPath) => {
				queueChange(changedPath, 'change');
			});

			watcher.on('add', (changedPath) => {
				queueChange(changedPath, 'add');
			});

			// Unlink is triggered when a file is deleted
			watcher.on('unlink', (changedPath) => {
				queueChange(changedPath, 'unlink');
			});
		},
	} satisfies Loader;
}

// Fields the loader itself supplies; a dataHandler's output needs a custom schema
export const ImageLoaderBaseSchema = z.object({
	src: z.string(),
	modifiedTime: z.date(),
});

/**
 * Convenience helper returning a loader and schema pair ready for `defineCollection`.
 * Pass a schema matching your dataHandler output; the base schema covers loader-only use.
 */
export function defineImageCollection<TSchema extends z.ZodType = typeof ImageLoaderBaseSchema>({
	schema = ImageLoaderBaseSchema as unknown as TSchema,
	...options
}: Partial<ImageLoaderOptions> & { schema?: TSchema }) {
	return { loader: imageLoader(options), schema };
}
