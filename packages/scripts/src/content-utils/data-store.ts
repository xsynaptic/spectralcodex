/**
 * Astro Data Store Deserializer
 *
 * Reads and deserializes Astro's data-store.json outside of Astro's runtime context.
 * This enables access to content collections from standalone scripts, regardless of
 * whether content originates from local files or remote sources.
 *
 * Implementation uses the `devalue` library, matching Astro's internal serialization.
 *
 * @see https://github.com/withastro/astro/blob/main/packages/astro/src/content/data-store.ts
 */
import * as devalue from 'devalue';
import { existsSync, readFileSync } from 'node:fs';

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
 * The full data store is a map of collection names to collections (which are maps of entry IDs to entries)
 */
type DataStoreCollections = Map<string, Map<string, DataStoreEntry>>;

/**
 * Result of loading the data store
 */
interface DataStoreResult {
	collections: DataStoreCollections;
	path: string;
}

/**
 * Load and deserialize Astro's data store
 *
 * @param dataStorePath - Path to data-store.json
 * @returns The parsed data store
 * @throws Error if data store file doesn't exist
 */
export function loadDataStore(dataStorePath: string): DataStoreResult {
	if (!existsSync(dataStorePath)) {
		throw new Error(
			`Data store not found at: ${dataStorePath}\nRun \`astro sync\` first to generate the data store.`,
		);
	}

	const raw = readFileSync(dataStorePath, 'utf8');
	const collections = devalue.parse(raw) as DataStoreCollections;

	return {
		collections,
		path: dataStorePath,
	};
}

/**
 * Get entries from a specific collection
 */
export function getCollection(
	collections: DataStoreCollections,
	name: string,
): Array<DataStoreEntry> {
	const collection = collections.get(name);
	return collection ? [...collection.values()] : [];
}
