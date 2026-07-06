import Keyv from 'keyv';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

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
