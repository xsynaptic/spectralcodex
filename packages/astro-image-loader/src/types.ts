import type { LoaderContext } from 'astro/loaders';

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
	modifiedTime: Date;
	logger: LoaderContext['logger'];
}) => Record<string, unknown> | Promise<Record<string, unknown>>;

export interface FileChangeQueueItem {
	filePath: string;
	id: string;
	type: 'change' | 'add' | 'unlink';
}

// Valid image formats supported by Astro; note that SVGs will *not* be processed
// This is lifted from `astro/src/assets/consts.ts`
export const VALID_INPUT_FORMATS = [
	'jpeg',
	'jpg',
	'png',
	'tiff',
	'webp',
	'gif',
	'svg',
	'avif',
] as const;

export interface ImageLoaderOptions {
	/** The base directory to resolve images from. Relative to the root directory, or an absolute file URL. Defaults to `.` */
	base: string;
	/** Glob pattern(s) matched against paths relative to the base directory. Defaults to all Astro-supported image formats, ignoring underscore-prefixed filenames. */
	pattern: string | Array<string>;
	/** How many images to process at a time. */
	concurrency: number;
	/** Debounce window for batching watch-mode file events, in milliseconds. */
	debounceMs: number;
	/**
	 * Serializable cache-busting key folded into every entry digest.
	 * Change it (e.g. when the collection schema or metadata extraction logic changes) to force all entries to regenerate.
	 */
	invalidationKey?: string;
	/**
	 * Function that generates an ID for an entry. Default implementation generates an ID from the entry path.
	 * @returns The ID of the entry. Must be unique per collection.
	 **/
	generateId: (options: LocalImageLoaderGenerateIdOptions) => string;
	/**
	 * Function that processes file and EXIF metadata for an image. This should match whatever custom metadata schema is defined for use with this loader as a record type.
	 * @returns Image metadata ready to be parsed.
	 **/
	dataHandler?: LocalImageLoaderDataHandler;
	/**
	 * Run once before loading all images and before each watch-mode batch; can be used to invoke a setup function.
	 */
	beforeLoad?: () => void | Promise<void>;
	/**
	 * Run once after loading all images and after each watch-mode batch.
	 * Full loads receive every live base-joined relative file path; useful for pruning external caches. Watch batches receive none.
	 */
	afterLoad?: (context: { filePathsRelative?: Array<string> }) => void | Promise<void>;
}
