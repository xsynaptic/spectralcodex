import type { WriteStream } from 'node:fs';

import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ImageLoaderCache, ImageLoaderCacheValue } from './types';

interface JsonlCacheLine {
	key: string;
	value: ImageLoaderCacheValue;
}

/**
 * Minimal durable cache: one JSON object per line, appended as entries are processed
 * Appends make partial progress crash-safe; prune compacts the file to live keys only
 */
export function createJsonlCache({ filePath }: { filePath: string }): ImageLoaderCache {
	let hydration: Promise<Map<string, ImageLoaderCacheValue>> | undefined;
	let appendStream: WriteStream | undefined;

	// Memoize the promise, not the map, or concurrent callers see an empty cache mid-read
	function hydrate() {
		if (hydration) return hydration;

		hydration = (async () => {
			const entries = new Map<string, ImageLoaderCacheValue>();

			if (existsSync(filePath)) {
				const contents = await readFile(filePath, 'utf8');

				// Later lines win; malformed lines (e.g. from an interrupted write) are skipped
				for (const line of contents.split('\n')) {
					if (!line) continue;
					try {
						const parsed = JSON.parse(line) as JsonlCacheLine;

						entries.set(parsed.key, parsed.value);
					} catch {
						continue;
					}
				}
			}
			return entries;
		})();

		return hydration;
	}

	async function getAppendStream() {
		if (appendStream) return appendStream;

		await mkdir(path.dirname(filePath), { recursive: true });
		appendStream = createWriteStream(filePath, { flags: 'a' });
		return appendStream;
	}

	return {
		get: async (key) => {
			const cache = await hydrate();

			return cache.get(key);
		},
		set: async (key, value) => {
			const cache = await hydrate();

			cache.set(key, value);

			const stream = await getAppendStream();
			const line = `${JSON.stringify({ key, value } satisfies JsonlCacheLine)}\n`;

			await new Promise<void>((resolve, reject) => {
				stream.write(line, (error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});
		},
		prune: async (liveKeys) => {
			const cache = await hydrate();
			const liveKeySet = new Set(liveKeys);

			for (const key of cache.keys()) {
				if (!liveKeySet.has(key)) cache.delete(key);
			}

			// Compact: rewrite with live keys only, atomically via temp file + rename
			if (appendStream) {
				await new Promise((resolve) => appendStream?.end(resolve));
				appendStream = undefined;
			}

			const lines = [...cache].map(([key, value]) =>
				JSON.stringify({ key, value } satisfies JsonlCacheLine),
			);
			const tempPath = `${filePath}.tmp`;

			await mkdir(path.dirname(filePath), { recursive: true });
			await writeFile(tempPath, lines.length > 0 ? `${lines.join('\n')}\n` : '');
			await rename(tempPath, filePath);
		},
	};
}
