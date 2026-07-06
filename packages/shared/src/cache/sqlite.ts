import Keyv from 'keyv';
import path from 'node:path';

import { createSqliteStore } from './sqlite-store';

/**
 * Initialize Keyv with SQLite backend; best for concurrent access during Astro builds
 */
export function getSqliteCacheInstance(cachePath: string, namespace: string): Keyv {
	return new Keyv({
		store: createSqliteStore({ filePath: path.join(cachePath, `${namespace}.sqlite`) }),
		namespace,
	});
}
