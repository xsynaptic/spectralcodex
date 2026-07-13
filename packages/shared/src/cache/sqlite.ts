import Keyv from 'keyv';
import path from 'node:path';

import { createSqliteStore } from './sqlite-store';

/**
 * Initialize Keyv with SQLite backend; best for concurrent access during Astro builds
 * The instance carries a prune method for evicting keys no longer in a valid set
 */
export function getSqliteCacheInstance(cachePath: string, namespace: string) {
	const store = createSqliteStore({ filePath: path.join(cachePath, `${namespace}.sqlite`) });

	return Object.assign(new Keyv({ store, namespace }), {
		// Keyv prefixes stored keys with the namespace, so valid keys must be prefixed to match
		prune: (validKeys: Array<string>) =>
			store.prune(
				validKeys.map((key) => `${namespace}:${key}`),
				`${namespace}:`,
			),
	});
}
