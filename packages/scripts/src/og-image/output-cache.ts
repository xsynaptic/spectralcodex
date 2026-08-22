import { promises as fs } from 'node:fs';
import path from 'node:path';

// Records the last key seen per id so freshness survives across runs
export interface OutputCacheStore {
	get: (id: string) => Promise<string | undefined>;
	set: (id: string, key: string) => Promise<void>;
}

export interface OutputCacheOptions {
	dir: string;
	extension?: string;
	store: OutputCacheStore;
	// Folded into every key, so a bump invalidates every card
	version?: string;
}

// A stable {id}.{ext} filename keeps the public URL fixed; freshness lives in the store
export function createOutputCache(options: OutputCacheOptions) {
	const { dir, extension = 'jpg', store, version } = options;

	function filePath(id: string): string {
		return path.join(dir, `${id}.${extension}`);
	}

	function effectiveKey(key: string): string {
		return version ? `${version}:${key}` : key;
	}

	async function isFresh(id: string, key: string): Promise<boolean> {
		const recorded = await store.get(id);

		if (recorded !== effectiveKey(key)) return false;

		try {
			await fs.access(filePath(id));

			return true;
		} catch {
			return false;
		}
	}

	async function write(id: string, key: string, data: Uint8Array): Promise<void> {
		await fs.writeFile(filePath(id), data);
		await store.set(id, effectiveKey(key));
	}

	return { isFresh, write };
}
