import type { LoaderContext } from 'astro/loaders';

interface LocalImageLoaderGenerateIdOptions {
	/** The path to the entry file, relative to the base directory */
	filePath: string;
	/** The base directory URL */
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

export interface ImageLoaderCacheValue {
	/** The per-entry digest current when this value was cached; a mismatch invalidates it */
	digest: string;
	/** The full dataHandler output for this entry; must be JSON-serializable: values like Date would come back as strings on a cache hit and diverge from the fresh path */
	data: Record<string, unknown>;
}

/**
 * Durable cache for dataHandler output, surviving Astro data store wipes
 * Keys are base-joined relative file paths; the loader owns all orchestration
 */
export interface ImageLoaderCache {
	get: (
		key: string,
	) => ImageLoaderCacheValue | undefined | Promise<ImageLoaderCacheValue | undefined>;
	set: (key: string, value: ImageLoaderCacheValue) => void | Promise<void>;
	/** Called after every full load with all live keys; evict the rest. */
	prune?: (liveKeys: Array<string>) => void | Promise<void>;
}

// Valid image formats supported by Astro, lifted from `astro/src/assets/consts.ts`
// Astro does not export this constant publicly, so this pinned copy cannot be drift-tested
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
	/** Glob pattern(s) matched against paths relative to the base directory. Defaults to all Astro-supported raster formats */
	pattern: string | Array<string>;
	/** How many images to process at a time */
	concurrency: number;
	/** Debounce window for batching watch-mode file events, in milliseconds */
	debounceMs: number;
	/**
	 * Serializable cache-busting key folded into every entry digest
	 * Change it (*e.g.* when the collection schema or metadata extraction logic changes) to force all entries to regenerate
	 */
	invalidationKey?: string;
	/**
	 * Function that generates an ID for an entry. Default implementation generates an ID from the entry path
	 * @returns The ID of the entry. Must be unique per collection
	 **/
	generateId: (options: LocalImageLoaderGenerateIdOptions) => string;
	/**
	 * Function that processes file and EXIF metadata for an image. This should match whatever custom metadata schema is defined for use with this loader as a record type
	 * @returns Image metadata ready to be parsed
	 **/
	dataHandler?: LocalImageLoaderDataHandler;
	/**
	 * Durable cache for dataHandler output, surviving Astro data store wipes
	 * Defaults to a JSONL file under Astro's cacheDir; pass an implementation to bring your own storage, or false to disable
	 */
	cache?: ImageLoaderCache | false;
	/**
	 * Run once before loading all images and before each watch-mode batch; can be used to invoke a setup function
	 */
	beforeLoad?: () => void | Promise<void>;
	/**
	 * Run once after loading all images and after each watch-mode batch; can be used to invoke a clean-up function
	 */
	afterLoad?: () => void | Promise<void>;
}
