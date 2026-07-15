import Keyv from 'keyv';
import path from 'node:path';

import { createSqliteStore } from './sqlite-store';

/**
 * Initialize Keyv with SQLite backend; best for concurrent access during Astro builds
 */
export function getSqliteCacheInstance(cachePath: string, namespace: string) {
	const store = createSqliteStore({ filePath: path.join(cachePath, `${namespace}.sqlite`) });

	return new Keyv({ store, namespace });
}
