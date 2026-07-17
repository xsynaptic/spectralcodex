/**
 * Astro Data Store Deserializer
 *
 * Reads and deserializes Astro's data store outside of Astro's runtime context.
 * This enables access to content collections from standalone scripts, regardless of
 * whether content originates from local files or remote sources.
 *
 * Astro >= 7.1 writes one of two layouts depending on experimental `collectionStorage`:
 * - single (default): the whole store as one devalue payload in `data-store.json`
 * - chunked: a `data-store/` dir with `manifest.json` mapping each collection to devalue chunk files
 *
 * Implementation uses the `devalue` library, matching Astro's internal serialization.
 *
 * @see https://github.com/withastro/astro/blob/main/packages/astro/src/content/mutable-data-store.ts
 * @see https://github.com/withastro/astro/blob/main/packages/astro/src/content/data-store-writer.ts
 */
import { ASTRO_CACHE_DIR } from '@spectralcodex/shared/constants';
import * as devalue from 'devalue';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Scripts run after astro sync/build, which write the data store to cacheDir
// We never read the dev server data store
export const DATA_STORE_PATH = path.join(ASTRO_CACHE_DIR, 'data-store.json');

// Chunked layout names mirror astro/src/content/consts.ts
const DATA_STORE_CHUNKED_DIR = 'data-store';
const DATA_STORE_MANIFEST_FILE = 'manifest.json';

export interface DataStoreEntry {
	id: string;
	data: Record<string, unknown>;
	body?: string;
	digest?: string;
	filePath?: string;
	deferredRender?: boolean;
	rendered?: {
		html: string;
		metadata?: Record<string, unknown>;
	};
	assetImports?: Array<string>;
}

/**
 * Resolve the public-facing ID for a data-store entry
 * Locations with overrides return the override ID; all other entries return entry.id
 */
export function getPublicId(entry: DataStoreEntry): string {
	const override = entry.data.override as { id?: string } | undefined;

	return override?.id ?? entry.id;
}

/**
 * The full data store is a map of collection names to collections (which are maps of entry IDs to entries)
 */
export type DataStoreCollections = Map<string, Map<string, DataStoreEntry>>;

/**
 * Maps each region ID to its parent ID (undefined for root regions)
 */
export type RegionParentMap = Map<string, string | undefined>;

/**
 * Result of loading the data store
 */
interface DataStoreResult {
	collections: DataStoreCollections;
	regionParentMap: RegionParentMap;
	path: string;
}

function buildRegionParentMap(collections: DataStoreCollections): RegionParentMap {
	const regions = collections.get('regions');

	const parentMap = new Map<string, string | undefined>();

	if (!regions) return parentMap;

	for (const [id, entry] of regions) {
		parentMap.set(id, entry.data.parent as string | undefined);
	}

	return parentMap;
}

interface ResolvedDataStore {
	layout: 'single' | 'chunked';
	path: string;
}

// Both layouts can coexist after toggling collectionStorage (Astro never cleans the inactive one); the newer write wins
// Astro skips byte-identical rewrites, so mtimes can briefly favor the stale layout right after a toggle
function resolveDataStore(dataStorePath: string): ResolvedDataStore {
	const chunkedDirPath = path.join(path.dirname(dataStorePath), DATA_STORE_CHUNKED_DIR);
	const manifestPath = path.join(chunkedDirPath, DATA_STORE_MANIFEST_FILE);

	const hasSingle = existsSync(dataStorePath);
	const hasChunked = existsSync(manifestPath);

	if (hasSingle && hasChunked) {
		return statSync(manifestPath).mtimeMs > statSync(dataStorePath).mtimeMs
			? { layout: 'chunked', path: chunkedDirPath }
			: { layout: 'single', path: dataStorePath };
	}
	if (hasChunked) {
		return { layout: 'chunked', path: chunkedDirPath };
	}
	if (hasSingle) {
		return { layout: 'single', path: dataStorePath };
	}
	throw new Error(
		`Data store not found at: ${dataStorePath} (or chunked equivalent at: ${chunkedDirPath})\nRun \`astro sync\` first to generate the data store.`,
	);
}

function parseSingleDataStore(filePath: string): DataStoreCollections {
	return devalue.parse(readFileSync(filePath, 'utf8')) as DataStoreCollections;
}

function parseChunkedDataStore(dirPath: string): DataStoreCollections {
	const manifest = JSON.parse(
		readFileSync(path.join(dirPath, DATA_STORE_MANIFEST_FILE), 'utf8'),
	) as Record<string, Array<string>>;

	const collections: DataStoreCollections = new Map();

	for (const [collectionName, chunkFileNames] of Object.entries(manifest)) {
		// Each collection is one devalue payload, split at byte boundaries; reassemble before parsing
		const serialized = chunkFileNames
			.map((chunkFileName) => readFileSync(path.join(dirPath, chunkFileName), 'utf8'))
			.join('');

		collections.set(collectionName, devalue.parse(serialized) as Map<string, DataStoreEntry>);
	}

	return collections;
}

/**
 * Load and deserialize Astro's data store, whichever layout is on disk
 *
 * @param dataStorePath - Path to data-store.json; the chunked layout is probed in the same directory
 * @returns The parsed data store; `path` reflects the layout actually read (file or chunk directory)
 * @throws Error if no data store exists in either layout
 */
export function loadDataStore(dataStorePath: string): DataStoreResult {
	const resolved = resolveDataStore(dataStorePath);

	const collections =
		resolved.layout === 'chunked'
			? parseChunkedDataStore(resolved.path)
			: parseSingleDataStore(resolved.path);

	return {
		collections,
		regionParentMap: buildRegionParentMap(collections),
		path: resolved.path,
	};
}

/**
 * Get entries from a specific collection
 */
export function getDataStoreCollection(
	collections: DataStoreCollections,
	names: Array<string>,
): Array<DataStoreEntry> {
	const entries: Array<DataStoreEntry> = [];

	for (const name of names) {
		const collection = collections.get(name);

		if (!collection) {
			throw new Error(`Unknown collection: "${name}"`);
		}

		entries.push(...collection.values());
	}

	return entries;
}

/**
 * Get ancestors from root down to the region itself
 * [0] = root, [1] = second-most ancestral, ..., [last] = regionId
 */
export function getDataStoreRegionParentsById(
	regionId: string | undefined,
	parentMap: RegionParentMap,
): Array<string> {
	if (!regionId) return [];

	const chain: Array<string> = [regionId];
	let parent = parentMap.get(regionId);

	while (parent !== undefined) {
		chain.push(parent);
		parent = parentMap.get(parent);
	}
	return chain.toReversed();
}
