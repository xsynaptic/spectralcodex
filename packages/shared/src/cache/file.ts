import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';
import path from 'node:path';

/**
 * Initialize Keyv with file-based JSON backend
 * Best for batch processing scripts
 */
export function getFileCacheInstance(cachePath: string, namespace: string): Keyv {
	return new Keyv({
		store: new KeyvFile({
			filename: path.join(cachePath, `${namespace}.json`),
			writeDelay: 100,
			serialize: JSON.stringify,
			deserialize: (val): unknown => JSON.parse(val.toString()),
		}),
		namespace,
	});
}
