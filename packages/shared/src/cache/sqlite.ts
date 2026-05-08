import KeyvSqlite from '@keyv/sqlite';
import Keyv from 'keyv';
import path from 'node:path';

/**
 * Initialize Keyv with SQLite backend; best for concurrent access during Astro builds
 * Be sure to externalize `sqlite3` and `bindings` in `astro.config.mjs` under vite.ssr.external
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
