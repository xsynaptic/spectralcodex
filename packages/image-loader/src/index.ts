/* eslint-disable @typescript-eslint/unbound-method -- Temporary fix for some type issues */
import fastGlob from 'fast-glob';
import micromatch from 'micromatch';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';

import type { Loader, LoaderContext } from 'astro/loaders';

interface LocalImageLoaderGenerateIdOptions {
	/** The path to the entry file, relative to the base directory. */
	filePath: string;
	/** The base directory URL. */
	base: URL;
}

type LocalImageLoaderDataHandler = (args: {
	id: string;
	filePath: string;
	filePathRelative: string;
	fileUrl: URL;
	logger: LoaderContext['logger'];
}) => Record<string, unknown> | Promise<Record<string, unknown>>;

/**
 * Valid formats that our base services support.
 * Certain formats can be imported (namely SVGs) but will not be processed.
 */
const VALID_SUPPORTED_FORMATS = [
	'jpeg',
	'jpg',
	'png',
	'tiff',
	'webp',
	'gif',
	'svg',
	'avif',
] as const;

const defaultGenerateId = ({ filePath }: LocalImageLoaderGenerateIdOptions) => filePath;

/**
 * Unlike `path.posix.relative`, this function will accept a platform path and return a posix path.
 */
function posixRelative(from: string, to: string) {
	const pathRelative = path.relative(from, to);

	return pathRelative.split(path.sep).join('/');
}

export function imageLoader(options: {
	/** The base directory to resolve images from. Relative to the root directory, or an absolute file URL. Defaults to `.` */
	base?: string;
	/** Valid image extensions to scan for. Defaults to the Astro defaults. */
	extensions?: (typeof VALID_SUPPORTED_FORMATS)[number][];
	/** How many images to process at a time. */
	concurrency?: number;
	/**
	 * Function that generates an ID for an entry. Default implementation generates a slug from the entry path.
	 * @returns The ID of the entry. Must be unique per collection.
	 **/
	generateId?: (options: LocalImageLoaderGenerateIdOptions) => string;
	/**
	 * Function that processes file and EXIF metadata for an image. This should match whatever custom metadata schema is defined for use with this loader as a record type.
	 * @returns Image metadata ready to be parsed.
	 **/
	dataHandler: LocalImageLoaderDataHandler;
	/**
	 * Run once after loading all images; can be used to invoke a setup function.
	 */
	beforeLoad?: () => void;
	/**
	 * Run once after loading all images; can be used to invoke a clean-up function.
	 */
	afterLoad?: () => void;
}) {
	const generateId = options.generateId ?? defaultGenerateId;

	// Limit the concurrency of files processed to reduce memory usage
	const limit = pLimit(options.concurrency ?? 20);

	return {
		name: 'local-image-loader',
		load: async ({
			config,
			store,
			parseData,
			generateDigest,
			logger,
			watcher,
		}: LoaderContext): Promise<void> => {
			const pattern =
				options.extensions && options.extensions.length > 0
					? `**/[^_]*.(${options.extensions.join('|')})`
					: `**/[^_]*.(${VALID_SUPPORTED_FORMATS.join('|')})`;

			const baseDir = options.base ? new URL(options.base, config.root) : config.root;

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

			const syncData = async ({
				id,
				filePath,
				modifiedTime,
			}: {
				id: string;
				filePath: string;
				modifiedTime?: Date | undefined;
			}) => {
				// If any of these props change an entry will be regenerated
				const digest = generateDigest({
					id,
					filePath,
					mtime: modifiedTime,
					options,
					env: import.meta.env.MODE,
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
					const filePathRelative = path.join(options.base ?? '', filePath);

					try {
						const parsedData = await parseData({
							id,
							filePath,
							data: {
								src: filePathRelative,
								modifiedTime,
								...(await options.dataHandler({
									id,
									filePath,
									filePathRelative,
									fileUrl,
									logger,
								})),
							},
						});

						store.set({
							id,
							filePath,
							digest,
							data: parsedData,
						});

						logger.info(`Adding to store: ${filePath}`);
					} catch {
						// TODO: better error handling; this block likely catches an AstroError
						throw new Error(`Error adding to store: ${filePath}`);
					}
				});
			};

			// Run the before load hook
			options.beforeLoad?.();

			// Loop through glob data and generate metadata as needed
			await Promise.all(
				imageGlobData.map(({ path: filePath, stats }) => {
					const id = generateId({ filePath, base: baseDir });

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

			// TODO: implement watcher; currently this does not work properly
			if (!watcher) {
				return;
			}

			const matcher: RegExp = micromatch.makeRe(pattern);

			const matchesGlob = (entry: string) => !entry.startsWith('../') && matcher.test(entry);

			const basePath = fileURLToPath(baseDir);

			// TODO: this is not picking up multiple file changes, probably something to do with promises
			async function watcherOnChange(changedPath: string) {
				const filePath = posixRelative(basePath, changedPath);

				if (!matchesGlob(filePath)) return;

				const id = generateId({ filePath, base: baseDir });

				options.beforeLoad?.();

				// TODO: modified time? Not sure how much this matters
				try {
					await syncData({ id, filePath, modifiedTime: new Date() });
				} catch (error) {
					console.error(error);
				}
				options.afterLoad?.();

				logger.info(`Reloaded data from ${filePath}`);
			}

			watcher.on('change', (changedPath) => {
				void watcherOnChange(changedPath);
			});

			watcher.on('add', (changedPath) => {
				void watcherOnChange(changedPath);
			});

			watcher.on('unlink', (deletedPath) => {
				const filePath = posixRelative(basePath, deletedPath);

				if (!matchesGlob(filePath)) return;

				const id = generateId({ filePath, base: baseDir });

				store.delete(id);
			});
		},
	} satisfies Loader;
}
