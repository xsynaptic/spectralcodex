import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';
import path from 'node:path';

export function getFileCacheInstance(cachePath: string, namespace: string): Keyv {
	return new Keyv({
		namespace,
		store: new KeyvFile({
			deserialize: (val): unknown => JSON.parse(val.toString()),
			filename: path.join(cachePath, `${namespace}.json`),
			serialize: JSON.stringify,
			writeDelay: 100,
		}),
	});
}
