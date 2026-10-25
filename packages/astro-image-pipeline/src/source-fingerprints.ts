import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pipeline } from 'node:stream/promises';

import { readSourceSize } from '#image-render.ts';

interface SourceFingerprint {
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

function openDatabase(cachePath: string) {
	mkdirSync(cachePath, { recursive: true });

	const database = new DatabaseSync(path.join(cachePath, 'source-fingerprints.sqlite'));

	database.exec(
		'PRAGMA busy_timeout = 10000; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL',
	);
	database.exec(
		'CREATE TABLE IF NOT EXISTS fingerprints (path TEXT PRIMARY KEY, version TEXT NOT NULL, sha256 TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL)',
	);

	return database;
}

// Hashing every source takes about 21 s, so a file whose modified time and size haven't changed reuses its stored hash
export function createSourceFingerprints(cachePath: string): SourceFingerprints {
	const database = openDatabase(cachePath);
	const selectStatement = database.prepare(
		'SELECT sha256, width, height FROM fingerprints WHERE path = ? AND version = ?',
	);
	const upsertStatement = database.prepare(
		'INSERT INTO fingerprints (path, version, sha256, width, height) VALUES (?, ?, ?, ?, ?) ON CONFLICT(path) DO UPDATE SET version = excluded.version, sha256 = excluded.sha256, width = excluded.width, height = excluded.height',
	);

	return {
		async get(filePath) {
			const absolutePath = path.resolve(filePath);
			const stats = await getFileStats(absolutePath);

			if (!stats) return;

			const version = `${String(stats.mtimeMs)}:${String(stats.size)}`;
			const cached = selectStatement.get(absolutePath, version) as SourceFingerprint | undefined;

			if (cached) return { height: cached.height, sha256: cached.sha256, width: cached.width };

			const digest = createHash('sha256');

			await pipeline(createReadStream(absolutePath), digest);

			const { height, width } = await readSourceSize(absolutePath);
			const fingerprint = { height, sha256: digest.digest('hex'), width };

			upsertStatement.run(absolutePath, version, fingerprint.sha256, width, height);

			return fingerprint;
		},
	};
}
