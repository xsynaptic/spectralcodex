import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface Cache<Value> {
	get(key: string, hash: string): undefined | Value;
	set(key: string, hash: string, value: Value): void;
}

const schemaVersion = 1;
const retentionDays = 90;

function getDayStamp() {
	return Math.floor(Date.now() / 86_400_000);
}

export function createSqliteCache<Value>(cachePath: string, namespace: string): Cache<Value> {
	mkdirSync(cachePath, { recursive: true });

	const database = new DatabaseSync(path.join(cachePath, `${namespace}.sqlite`));

	database.exec('PRAGMA busy_timeout = 10000');
	database.exec('PRAGMA journal_mode = WAL');
	database.exec('PRAGMA synchronous = NORMAL');

	database.exec('BEGIN IMMEDIATE');

	const version = database.prepare('PRAGMA user_version').get() as { user_version: number };

	if (version.user_version !== schemaVersion) {
		database.exec('DROP TABLE IF EXISTS cache');
		database.exec(
			'CREATE TABLE cache (key TEXT PRIMARY KEY, hash TEXT NOT NULL, value TEXT NOT NULL, used_day INTEGER NOT NULL)',
		);
		// eslint-disable-next-line unicorn/no-unsafe-sqlite-interpolation -- PRAGMA takes no bound parameters
		database.exec(`PRAGMA user_version = ${String(schemaVersion)}`);
	}

	database
		.prepare('DELETE FROM cache WHERE used_day < (SELECT MAX(used_day) FROM cache) - ?')
		.run(retentionDays);
	database.exec('COMMIT');

	const selectStatement = database.prepare(
		'SELECT value, used_day FROM cache WHERE key = ? AND hash = ?',
	);
	const touchStatement = database.prepare('UPDATE cache SET used_day = ? WHERE key = ?');
	const upsertStatement = database.prepare(
		'INSERT INTO cache (key, hash, value, used_day) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET hash = excluded.hash, value = excluded.value, used_day = excluded.used_day',
	);

	return {
		get(key, hash) {
			const row = selectStatement.get(key, hash) as undefined | { used_day: number; value: string };

			if (!row) return;

			const today = getDayStamp();

			if (row.used_day < today) touchStatement.run(today, key);

			return JSON.parse(row.value) as Value;
		},
		set(key, hash, value) {
			upsertStatement.run(key, hash, JSON.stringify(value), getDayStamp());
		},
	};
}
