import KeyvSqlite from '@keyv/sqlite';
import Keyv from 'keyv';
import path from 'node:path';

/**
 * Initialize Keyv with SQLite backend
 * Best for concurrent access during Astro builds
 * Uses dynamic import to avoid bundling sqlite3 into shared chunks
 */
export function getSqliteCacheInstance(cachePath: string, namespace: string): Keyv {
	return new Keyv({
		store: new KeyvSqlite({
			uri: `sqlite://${path.join(cachePath, `${namespace}.sqlite`)}`,
			table: 'cache',
			busyTimeout: 10_000,
		}),
		namespace,
	});
}
