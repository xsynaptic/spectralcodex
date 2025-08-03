/* eslint-disable @typescript-eslint/unbound-method -- Temporary fix for some type issues */
import type { Loader, LoaderContext } from 'astro/loaders';

import fastGlob from 'fast-glob';
import micromatch from 'micromatch';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';

import type { FileChangeQueueItem, ImageLoaderOptions, ValidInputFormat } from './types';

import { VALID_INPUT_FORMATS } from './types';

const defaultOptions = {
	base: '.',
	extensions: [...VALID_INPUT_FORMATS],
	concurrency: 50,
	generateId: ({ filePath }) => filePath,
} as const satisfies ImageLoaderOptions;

function getSyncDataFunction({
	baseDir,
	options,
	store,
	parseData,
	generateDigest,
	logger,
}: Pick<LoaderContext, 'store' | 'parseData' | 'generateDigest' | 'logger'> & {
	baseDir: URL;
	options: ImageLoaderOptions;
}) {
	// Limit the concurrency of files processed to reduce memory usage
	const limit = pLimit(options.concurrency);

	return async function syncData({
		id,
		filePath,
		modifiedTime,
	}: {
		id: string;
		filePath: string;
		modifiedTime?: Date | undefined;
	}) {
		// If any of these props change an entry will be regenerated
		const digest = generateDigest({
			id,
			filePath,
			mtime: modifiedTime,
			options,
		});

		// Does this entry already exist?
		const existingEntry = store.get(filePath);

		// If the data entry is already in the store and seems current, skip further processing
		if (existingEntry && existingEntry.digest === digest && existingEntry.filePath) {
			// This seems to be necessary otherwise the Zod schema transforms module data
			if (existingEntry.deferredRender) {
				store.addModuleImport(existingEntry.filePath);
			}

			if (existingEntry.assetImports?.length) {
				// Add asset imports for existing entries
				// @ts-expect-error -- This exists but isn't properly exported
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				store.addAssetImports(existingEntry.assetImports, existingEntry.filePath);
			}
			return;
		}

		// Now do the heavy lifting: reading files, processing metadata, etc.
		return limit(async () => {
			// A file URL used to generate a buffer for Sharp
			const fileUrl = new URL(filePath, baseDir);

			// Relative to the project root, where is this image found; it needs to be importable
			const filePathRelative = path.join(options.base, filePath);

			try {
				const parsedData = await parseData({
					id,
					filePath,
					data: {
						src: filePathRelative,
						modifiedTime,
						...(options.dataHandler
							? await options.dataHandler({
									id,
									filePath,
									filePathRelative,
									fileUrl,
									logger,
								})
							: {}),
					},
				});

				store.set({
					id,
					filePath,
					digest,
					data: parsedData,
				});

				logger.info(`Updated store: ${filePath}`);
			} catch (error) {
				// TODO: better error handling; this block likely catches an AstroError
				throw new Error(`Error adding to store: ${filePath}: ${JSON.stringify(error)}`);
			}
		});
	};
}

// Only return the relative path if it matches what we're watching
function getFilePathMatchesFunction(pattern: string, baseDir: URL) {
	const matcher: RegExp = micromatch.makeRe(pattern);

	const matchesGlob = (entry: string) => !entry.startsWith('../') && matcher.test(entry);

	const basePath = fileURLToPath(baseDir);

	return function filePathMatches(changedPath: string) {
		const extension = path.extname(changedPath).replaceAll('.', '');

		if (VALID_INPUT_FORMATS.includes(extension as ValidInputFormat)) {
			const pathRelative = path.relative(basePath, changedPath);
			const filePath = pathRelative.split(path.sep).join('/');

			if (matchesGlob(filePath)) return filePath;
		}
		return;
	};
}

export function imageLoader(optionsPartial: Partial<ImageLoaderOptions>) {
	const options = {
		...defaultOptions,
		...optionsPartial,
	} satisfies ImageLoaderOptions;

	return {
		name: 'local-image-loader',
		load: async function load(context: LoaderContext): Promise<void> {
			const { config, store, parseData, generateDigest, logger, watcher } = context;

			const pattern =
				options.extensions.length > 0
					? `**/[^_]*.(${options.extensions.join('|')})`
					: `**/[^_]*.(${VALID_INPUT_FORMATS.join('|')})`;

			const baseDir = new URL(options.base, config.root);

			if (!baseDir.pathname.endsWith('/')) {
				baseDir.pathname = `${baseDir.pathname}/`;
			}

			const imageGlobData = await fastGlob(pattern, {
				cwd: fileURLToPath(baseDir),
				stats: true, // Collect last modified time
			});

			logger.info(`Synced ${String(imageGlobData.length)} images`);

			// Keep track of entries that are no longer present (*e.g.* deleted)
			const untouchedEntries = new Set(store.keys());

			// Generate the data sync function; this is mostly for code readability
			const syncData = getSyncDataFunction({
				baseDir,
				options,
				store,
				parseData,
				generateDigest,
				logger,
			});

			// Run the before load hook
			options.beforeLoad?.();

			// Loop through glob data and generate metadata as needed
			await Promise.all(
				imageGlobData.map(({ path: filePath, stats }) => {
					const id = options.generateId({ filePath, base: baseDir });

					// This entry will be synced; don't remove it later on
					untouchedEntries.delete(id);

					return syncData({ id, filePath, modifiedTime: stats?.mtime });
				}),
			);

			// Run the after load hook
			options.afterLoad?.();

			// Remove entries that were not found this time; they were presumably deleted
			for (const id of untouchedEntries) {
				store.delete(id);
			}

			if (!watcher) return;

			const filePathMatches = getFilePathMatchesFunction(pattern, baseDir);

			// Create a debounced queue for file changes
			const changeQueue = new Map<string, FileChangeQueueItem>();

			let changeTimeout: NodeJS.Timeout | undefined = undefined;

			function queueChange(changedPath: string, type: 'change' | 'add' | 'unlink') {
				const filePath = filePathMatches(changedPath);

				if (!filePath) return;

				const id = options.generateId({ filePath, base: baseDir });

				changeQueue.set(filePath, { filePath, id, type });

				// Debounce processing changes
				if (changeTimeout) clearTimeout(changeTimeout);

				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				changeTimeout = setTimeout(async () => {
					options.beforeLoad?.();

					// Process all queued changes
					for (const change of changeQueue.values()) {
						try {
							if (change.type === 'unlink') {
								store.delete(change.id);
								logger.info(`Deleted from store: ${change.filePath}`);
							} else {
								await syncData({
									id: change.id,
									filePath: change.filePath,
									modifiedTime: new Date(),
								});
							}
						} catch (error) {
							logger.error(
								`Error processing ${change.type} for ${change.filePath}: ${JSON.stringify(error)}`,
							);
						}
					}

					changeQueue.clear();

					options.afterLoad?.();
				}, 300);
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
