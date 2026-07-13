import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { createJsonlCache } from './jsonl-cache';

async function getTempCachePath() {
	const dir = await mkdtemp(path.join(tmpdir(), 'jsonl-cache-'));

	return path.join(dir, 'nested', 'cache.jsonl');
}

describe('createJsonlCache', () => {
	test('roundtrips values and reports missing keys as undefined', async () => {
		const cache = createJsonlCache({ filePath: await getTempCachePath() });

		await cache.set('a.jpg', { digest: 'd1', data: { title: 'one' } });

		expect(await cache.get('a.jpg')).toEqual({ digest: 'd1', data: { title: 'one' } });
		expect(await cache.get('missing.jpg')).toBeUndefined();
	});

	test('concurrent reads during hydration all see the persisted data', async () => {
		const filePath = await getTempCachePath();
		const seed = createJsonlCache({ filePath });

		await seed.set('a.jpg', { digest: 'd1', data: {} });
		await seed.set('b.jpg', { digest: 'd2', data: {} });

		// Fresh instance: both gets race the initial file read
		const cache = createJsonlCache({ filePath });
		const [first, second] = await Promise.all([cache.get('a.jpg'), cache.get('b.jpg')]);

		expect(first).toEqual({ digest: 'd1', data: {} });
		expect(second).toEqual({ digest: 'd2', data: {} });
	});

	test('persists across instances', async () => {
		const filePath = await getTempCachePath();
		const first = createJsonlCache({ filePath });

		await first.set('a.jpg', { digest: 'd1', data: { title: 'one' } });

		const second = createJsonlCache({ filePath });

		expect(await second.get('a.jpg')).toEqual({ digest: 'd1', data: { title: 'one' } });
	});

	test('the last line wins for duplicate keys', async () => {
		const filePath = await getTempCachePath();
		const cache = createJsonlCache({ filePath });

		await cache.set('a.jpg', { digest: 'd1', data: { title: 'old' } });
		await cache.set('a.jpg', { digest: 'd2', data: { title: 'new' } });

		const rereadCache = createJsonlCache({ filePath });

		expect(await rereadCache.get('a.jpg')).toEqual({ digest: 'd2', data: { title: 'new' } });
	});

	test('skips malformed lines from interrupted writes', async () => {
		const filePath = await getTempCachePath();
		const seed = createJsonlCache({ filePath });

		await seed.set('a.jpg', { digest: 'd1', data: {} });

		await writeFile(filePath, `${await readFile(filePath, 'utf8')}{"key":"b.jpg","val`);

		const cache = createJsonlCache({ filePath });

		expect(await cache.get('a.jpg')).toEqual({ digest: 'd1', data: {} });
		expect(await cache.get('b.jpg')).toBeUndefined();
	});

	test('prune compacts the file down to live keys', async () => {
		const filePath = await getTempCachePath();
		const cache = createJsonlCache({ filePath });

		await cache.set('a.jpg', { digest: 'd1', data: {} });
		await cache.set('a.jpg', { digest: 'd2', data: {} });
		await cache.set('deleted.jpg', { digest: 'd3', data: {} });

		await cache.prune?.(['a.jpg']);

		expect(await cache.get('deleted.jpg')).toBeUndefined();
		expect(await cache.get('a.jpg')).toEqual({ digest: 'd2', data: {} });

		const contents = await readFile(filePath, 'utf8');
		const lines = contents.split('\n').filter(Boolean);

		expect(lines).toHaveLength(1);
	});

	test('appends still work after a prune compaction', async () => {
		const filePath = await getTempCachePath();
		const cache = createJsonlCache({ filePath });

		await cache.set('a.jpg', { digest: 'd1', data: {} });
		await cache.prune?.(['a.jpg']);
		await cache.set('b.jpg', { digest: 'd2', data: {} });

		const rereadCache = createJsonlCache({ filePath });

		expect(await rereadCache.get('a.jpg')).toEqual({ digest: 'd1', data: {} });
		expect(await rereadCache.get('b.jpg')).toEqual({ digest: 'd2', data: {} });
	});
});
