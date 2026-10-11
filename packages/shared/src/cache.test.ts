import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createSqliteCache } from '#cache.ts';

const dayMilliseconds = 86_400_000;
const startTime = new Date('2026-01-01T12:00:00Z').getTime();

function getTempCachePath() {
	return mkdtempSync(path.join(tmpdir(), 'sqlite-cache-'));
}

function setDay(day: number) {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(startTime + day * dayMilliseconds);
}

afterEach(() => {
	vi.useRealTimers();
});

describe('createSqliteCache', () => {
	test('roundtrips a structured value', () => {
		const cache = createSqliteCache<{ count: number }>(getTempCachePath(), 'roundtrip');

		cache.set('alpha', 'hash-one', { count: 1 });

		expect(cache.get('alpha', 'hash-one')).toEqual({ count: 1 });
		expect(cache.get('missing', 'hash-one')).toBeUndefined();
	});

	test('a hash mismatch misses', () => {
		const cache = createSqliteCache<string>(getTempCachePath(), 'mismatch');

		cache.set('alpha', 'hash-one', 'one');

		expect(cache.get('alpha', 'hash-two')).toBeUndefined();
	});

	test('set replaces the row for a key', () => {
		const cache = createSqliteCache<string>(getTempCachePath(), 'upsert');

		cache.set('alpha', 'hash-one', 'one');
		cache.set('alpha', 'hash-two', 'two');

		expect(cache.get('alpha', 'hash-one')).toBeUndefined();
		expect(cache.get('alpha', 'hash-two')).toBe('two');
	});

	test('persists across a second instance', () => {
		const cachePath = getTempCachePath();

		createSqliteCache<string>(cachePath, 'persist').set('alpha', 'hash-one', 'one');

		expect(createSqliteCache<string>(cachePath, 'persist').get('alpha', 'hash-one')).toBe('one');
	});

	test('a file with the old schema opens clean and empty', () => {
		const cachePath = getTempCachePath();
		const database = new DatabaseSync(path.join(cachePath, 'legacy.sqlite'));

		database.exec('CREATE TABLE cache (key TEXT PRIMARY KEY, value TEXT)');
		database.exec(`INSERT INTO cache (key, value) VALUES ('alpha', '"one"')`);
		database.close();

		const cache = createSqliteCache<string>(cachePath, 'legacy');

		expect(cache.get('alpha', 'hash-one')).toBeUndefined();

		cache.set('alpha', 'hash-one', 'two');

		expect(cache.get('alpha', 'hash-one')).toBe('two');
	});

	test('a row 91 days behind the newest is pruned on reopen', () => {
		const cachePath = getTempCachePath();

		setDay(0);
		createSqliteCache<string>(cachePath, 'prune').set('old', 'hash-one', 'one');

		setDay(91);
		createSqliteCache<string>(cachePath, 'prune').set('new', 'hash-one', 'two');

		const cache = createSqliteCache<string>(cachePath, 'prune');

		expect(cache.get('old', 'hash-one')).toBeUndefined();
		expect(cache.get('new', 'hash-one')).toBe('two');
	});

	test('a row 91 days behind today survives when it is the newest', () => {
		const cachePath = getTempCachePath();

		setDay(0);
		createSqliteCache<string>(cachePath, 'gap').set('alpha', 'hash-one', 'one');

		setDay(91);

		expect(createSqliteCache<string>(cachePath, 'gap').get('alpha', 'hash-one')).toBe('one');
	});

	test('a hit re-stamps a row so it survives', () => {
		const cachePath = getTempCachePath();

		setDay(0);

		const cache = createSqliteCache<string>(cachePath, 'restamp');

		cache.set('used', 'hash-one', 'one');
		cache.set('unused', 'hash-one', 'two');

		setDay(91);
		createSqliteCache<string>(cachePath, 'restamp').get('used', 'hash-one');

		const reopened = createSqliteCache<string>(cachePath, 'restamp');

		expect(reopened.get('used', 'hash-one')).toBe('one');
		expect(reopened.get('unused', 'hash-one')).toBeUndefined();
	});
});
