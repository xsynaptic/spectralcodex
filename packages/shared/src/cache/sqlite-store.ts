import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

interface SqliteStoreOptions {
	filePath: string;
	table?: string;
	busyTimeoutMs?: number;
}

/**
 * Minimal synchronous Keyv store backed by node:sqlite
 * Keyv handles namespacing, JSON serialization, and TTL envelopes; this store only moves strings
 */
export function createSqliteStore({
	filePath,
	table = 'cache',
	busyTimeoutMs = 10_000,
}: SqliteStoreOptions) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });

	const database = new DatabaseSync(filePath);

	// WAL for concurrent access during builds
	database.exec('PRAGMA journal_mode = WAL');
	database.exec(`PRAGMA busy_timeout = ${String(busyTimeoutMs)}`);
	database.exec(`CREATE TABLE IF NOT EXISTS ${table} (key TEXT PRIMARY KEY, value TEXT)`);

	const selectStatement = database.prepare(`SELECT value FROM ${table} WHERE key = ?`);
	const upsertStatement = database.prepare(
		`INSERT INTO ${table} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
	);
	const deletionStatement = database.prepare(`DELETE FROM ${table} WHERE key = ?`);
	const hasStatement = database.prepare(`SELECT 1 FROM ${table} WHERE key = ?`);

	return {
		get(key: string) {
			const row = selectStatement.get(key) as { value: string } | undefined;

			return row?.value;
		},
		set(key: string, value: string) {
			upsertStatement.run(key, value);
		},
		delete(key: string) {
			return deletionStatement.run(key).changes > 0;
		},
		clear() {
			database.exec(`DELETE FROM ${table}`);
		},
		has(key: string) {
			return hasStatement.get(key) !== undefined;
		},
	};
}
