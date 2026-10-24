import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

import { createSqliteCache } from '#cache.ts';

export interface SourceFingerprint {
	height: number;
	sha256: string;
	width: number;
}

export interface SourceFingerprints {
	get(filePath: string): Promise<SourceFingerprint | undefined>;
}

async function getFileStats(filePath: string) {
	try {
		return await stat(filePath);
	} catch {
		return;
	}
}

// Hashing every source costs 21 s; an unchanged (mtime, size) reuses the last digest
export function createSourceFingerprints(cachePath: string): SourceFingerprints {
	const cache = createSqliteCache<SourceFingerprint>(cachePath, 'source-fingerprints');

	return {
		async get(filePath) {
			const stats = await getFileStats(filePath);

			if (!stats) return;

			const version = `${String(stats.mtimeMs)}:${String(stats.size)}`;
			const cached = cache.get(filePath, version);

			if (cached) return cached;

			const digest = createHash('sha256');

			await pipeline(createReadStream(filePath), digest);

			const { height, width } = await sharp(filePath).metadata();
			const fingerprint = { height, sha256: digest.digest('hex'), width };

			cache.set(filePath, version, fingerprint);

			return fingerprint;
		},
	};
}
