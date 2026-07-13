import Keyv from 'keyv';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getSqliteCacheInstance } from './sqlite';
import { createSqliteStore } from './sqlite-store';

function getTempDbPath(name: string) {
	return path.join(mkdtempSync(path.join(tmpdir(), 'sqlite-store-')), `${name}.sqlite`);
}

describe('createSqliteStore', () => {
	test('roundtrips a value', () => {
		const store = createSqliteStore({ filePath: getTempDbPath('roundtrip') });

		store.set('alpha', 'one');

		expect(store.get('alpha')).toBe('one');
		expect(store.get('missing')).toBeUndefined();
	});

	test('upsert overwrites an existing key', () => {
		const store = createSqliteStore({ filePath: getTempDbPath('upsert') });

		store.set('alpha', 'one');
		store.set('alpha', 'two');

		expect(store.get('alpha')).toBe('two');
	});

	test('delete and clear', () => {
		const store = createSqliteStore({ filePath: getTempDbPath('delete') });

		store.set('alpha', 'one');
		store.set('beta', 'two');

		expect(store.delete('alpha')).toBe(true);
		expect(store.delete('alpha')).toBe(false);
		expect(store.get('alpha')).toBeUndefined();

		store.clear();

		expect(store.get('beta')).toBeUndefined();
		expect(store.has('beta')).toBe(false);
	});

	test('persists across a second store instance', () => {
		const filePath = getTempDbPath('persist');
		const storeFirst = createSqliteStore({ filePath });

		storeFirst.set('alpha', 'one');

		const storeSecond = createSqliteStore({ filePath });

		expect(storeSecond.get('alpha')).toBe('one');
		expect(storeSecond.has('alpha')).toBe(true);
	});

	test('prune removes rows outside the valid key set', () => {
		const store = createSqliteStore({ filePath: getTempDbPath('prune') });

		store.set('alpha', 'one');
		store.set('beta', 'two');
		store.set('gamma', 'three');

		expect(store.prune(['alpha', 'gamma'])).toBe(1);
		expect(store.get('beta')).toBeUndefined();
		expect(store.get('alpha')).toBe('one');
		expect(store.get('gamma')).toBe('three');
	});

	test('prune refuses an empty valid set instead of wiping the table', () => {
		const store = createSqliteStore({ filePath: getTempDbPath('prune-empty') });

		store.set('alpha', 'one');

		expect(store.prune([])).toBe(0);
		expect(store.get('alpha')).toBe('one');
	});

	test('prune only touches rows under the key prefix', () => {
		const store = createSqliteStore({ filePath: getTempDbPath('prune-prefix') });

		store.set('ns:alpha', 'one');
		store.set('ns:beta', 'two');
		store.set('other:gamma', 'three');

		expect(store.prune(['ns:alpha'], 'ns:')).toBe(1);
		expect(store.get('ns:beta')).toBeUndefined();
		expect(store.get('other:gamma')).toBe('three');

		// A prefix matching no rows prunes nothing, even with a non-empty valid set
		expect(store.prune(['stale:key'], 'stale:')).toBe(0);
		expect(store.get('ns:alpha')).toBe('one');
	});

	test('getSqliteCacheInstance prunes with namespaced keys', async () => {
		const cachePath = mkdtempSync(path.join(tmpdir(), 'sqlite-store-'));
		const cache = getSqliteCacheInstance(cachePath, 'prunable');

		await cache.set('alpha', { count: 1 });
		await cache.set('beta', { count: 2 });

		expect(cache.prune(['alpha'])).toBe(1);
		expect(await cache.get('alpha')).toEqual({ count: 1 });
		expect(await cache.get('beta')).toBeUndefined();
	});

	test('works as a Keyv store with namespacing and objects', async () => {
		const keyv = new Keyv({
			store: createSqliteStore({ filePath: getTempDbPath('keyv') }),
			namespace: 'test',
		});

		await keyv.set('entry', { hash: 'abc', count: 42 });

		expect(await keyv.get('entry')).toEqual({ hash: 'abc', count: 42 });
		expect(await keyv.get('missing')).toBeUndefined();

		await keyv.delete('entry');

		expect(await keyv.get('entry')).toBeUndefined();
	});
});
