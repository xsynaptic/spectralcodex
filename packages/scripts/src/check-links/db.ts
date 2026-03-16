import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import type { UrlStatus, UrlRow } from './types.ts';

import { UrlStatusEnum } from './types.ts';

const HEALTHY_MAX_AGE_DAYS = 90;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS urls (
  id INTEGER PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT '${UrlStatusEnum.Pending}',
  last_http_status INTEGER,
  redirect_url TEXT,
  check_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS url_sources (
  url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  PRIMARY KEY (url_id, content_id)
);

CREATE TABLE IF NOT EXISTS entry_digests (
  content_id TEXT PRIMARY KEY,
  digest TEXT NOT NULL
);
`;

let db: Database.Database;

export function openDatabase(dbPath: string): void {
	const dir = path.dirname(dbPath);

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	db = new Database(dbPath);

	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.exec(SCHEMA);
}

export function closeDatabase(): void {
	db.close();
}

export function getEntryDigest(contentId: string): string | undefined {
	const row = db.prepare('SELECT digest FROM entry_digests WHERE content_id = ?').get(contentId) as
		| { digest: string }
		| undefined;

	return row?.digest;
}

export function upsertUrl(url: string): number {
	const now = new Date().toISOString();

	db.prepare(
		`INSERT INTO urls (url, created_at, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(url) DO NOTHING`,
	).run(url, now, now);

	const row = db.prepare('SELECT id FROM urls WHERE url = ?').get(url) as { id: number };

	return row.id;
}

export function syncUrlSources(
	extractedSources: Array<{ urlId: number; contentId: string }>,
	extractedEntries: Set<string>,
	allEntryDigests: Array<{ contentId: string; digest: string }>,
): number {
	const sync = db.transaction(() => {
		// Delete sources only for entries we re-extracted
		const deleteStmt = db.prepare('DELETE FROM url_sources WHERE content_id = ?');

		for (const contentId of extractedEntries) {
			deleteStmt.run(contentId);
		}

		// Re-insert extracted sources
		const insertStmt = db.prepare(
			'INSERT OR IGNORE INTO url_sources (url_id, content_id) VALUES (?, ?)',
		);

		for (const s of extractedSources) {
			insertStmt.run(s.urlId, s.contentId);
		}

		// Delete sources for entries that no longer exist in any collection
		// (allEntryDigests contains every entry we saw, extracted or not)
		const allContentIds = new Set(allEntryDigests.map((e) => e.contentId));
		const existingSources = db
			.prepare('SELECT DISTINCT content_id FROM url_sources')
			.all() as Array<{ content_id: string }>;

		for (const row of existingSources) {
			if (!allContentIds.has(row.content_id)) {
				deleteStmt.run(row.content_id);
			}
		}

		// Update digests
		db.prepare('DELETE FROM entry_digests').run();

		const digestStmt = db.prepare('INSERT INTO entry_digests (content_id, digest) VALUES (?, ?)');

		for (const entry of allEntryDigests) {
			digestStmt.run(entry.contentId, entry.digest);
		}

		// Prune orphaned URLs
		return db
			.prepare('DELETE FROM urls WHERE id NOT IN (SELECT DISTINCT url_id FROM url_sources)')
			.run().changes;
	});

	return sync();
}

export function getUrlsToCheck(options: {
	recheck?: boolean;
	recheckStatuses?: Array<UrlStatus>;
	recheckAll?: boolean;
	maxMissing: number;
}): Array<UrlRow> {
	if (options.recheckAll) {
		return db.prepare('SELECT * FROM urls ORDER BY id').all() as Array<UrlRow>;
	}

	if (options.recheck) {
		const statuses = options.recheckStatuses ?? [
			UrlStatusEnum.Pending,
			UrlStatusEnum.Missing,
			UrlStatusEnum.Blocked,
			UrlStatusEnum.Error,
		];
		const placeholders = statuses.map(() => '?').join(', ');

		return db
			.prepare(`SELECT * FROM urls WHERE status IN (${placeholders}) ORDER BY id`)
			.all(...statuses) as Array<UrlRow>;
	}

	return db
		.prepare(
			`SELECT * FROM urls
       WHERE status = '${UrlStatusEnum.Pending}'
          OR (status IN ('${UrlStatusEnum.Missing}', '${UrlStatusEnum.Blocked}', '${UrlStatusEnum.Error}') AND check_count < ?)
          OR (status = '${UrlStatusEnum.Healthy}' AND updated_at < datetime('now', '-${String(HEALTHY_MAX_AGE_DAYS)} days'))
       ORDER BY id`,
		)
		.all(options.maxMissing) as Array<UrlRow>;
}

export function recordCheckResult(
	urlId: number,
	result: {
		httpStatus: number | undefined;
		status: UrlStatus;
		redirectUrl: string | undefined;
	},
): void {
	const now = new Date().toISOString();
	const incrementsCount =
		result.status === UrlStatusEnum.Missing ||
		result.status === UrlStatusEnum.Error ||
		result.status === UrlStatusEnum.Blocked;
	const checkCount = incrementsCount ? 'check_count + 1' : '0';

	db.prepare(
		`UPDATE urls
     SET status = ?, last_http_status = ?, redirect_url = ?, check_count = ${checkCount}, updated_at = ?
     WHERE id = ?`,
	).run(result.status, result.httpStatus, result.redirectUrl, now, urlId);
}

interface UrlByContentRow {
	content_id: string;
	url: string;
	redirect_url: string | null;
	last_http_status: number | null;
	check_count: number;
}

export function getUrlsByStatusGroupedByContent(
	status: UrlStatus,
): Map<string, Array<UrlByContentRow>> {
	const rows = db
		.prepare(
			`SELECT s.content_id, u.url, u.redirect_url, u.last_http_status, u.check_count
       FROM urls u
       JOIN url_sources s ON s.url_id = u.id
       WHERE u.status = ?
       ORDER BY s.content_id, u.url`,
		)
		.all(status) as Array<UrlByContentRow>;

	const grouped = new Map<string, Array<UrlByContentRow>>();

	for (const row of rows) {
		const existing = grouped.get(row.content_id);

		if (existing) {
			existing.push(row);
		} else {
			grouped.set(row.content_id, [row]);
		}
	}

	return grouped;
}

interface LinkCheckStats {
	total: number;
	healthy: number;
	redirect: number;
	missing: number;
	blocked: number;
	error: number;
	pending: number;
}

export function getStats(): LinkCheckStats {
	const rows = db
		.prepare('SELECT status, COUNT(*) as count FROM urls GROUP BY status')
		.all() as Array<{ status: string; count: number }>;

	const stats: LinkCheckStats = {
		total: 0,
		healthy: 0,
		redirect: 0,
		missing: 0,
		blocked: 0,
		error: 0,
		pending: 0,
	};

	for (const row of rows) {
		if (row.status in stats) {
			stats[row.status as keyof Omit<LinkCheckStats, 'total'>] = row.count;
		}

		stats.total += row.count;
	}

	return stats;
}
