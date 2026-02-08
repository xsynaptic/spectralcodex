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
	modifiedTime?: Date | undefined;
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

export type ValidInputFormat = (typeof VALID_INPUT_FORMATS)[number];

export interface ImageLoaderOptions {
	/** The base directory to resolve images from. Relative to the root directory, or an absolute file URL. Defaults to `.` */
	base: string;
	/** Valid image extensions to scan for. Defaults to the Astro defaults. */
	extensions: Array<ValidInputFormat>;
	/** How many images to process at a time. */
	concurrency: number;
	/**
	 * Function that generates an ID for an entry. Default implementation generates a slug from the entry path.
	 * @returns The ID of the entry. Must be unique per collection.
	 **/
	generateId: (options: LocalImageLoaderGenerateIdOptions) => string;
	/**
	 * Function that processes file and EXIF metadata for an image. This should match whatever custom metadata schema is defined for use with this loader as a record type.
	 * @returns Image metadata ready to be parsed.
	 **/
	dataHandler?: LocalImageLoaderDataHandler;
	/**
	 * Run once after loading all images; can be used to invoke a setup function.
	 */
	beforeLoad?: () => void | Promise<void>;
	/**
	 * Run once after loading all images; can be used to invoke a clean-up function.
	 */
	afterLoad?: () => void | Promise<void>;
}
