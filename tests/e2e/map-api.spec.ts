import { expect, test } from '@playwright/test';
import { MapDataKeysCompressed } from '@spectralcodex/shared/map';

const ID = MapDataKeysCompressed.Id;
const CHUNK_KEY = MapDataKeysCompressed.ChunkKey;

type MapApiItem = Record<string, unknown>;

test.describe('map data API', () => {
	test('global index is built and every row carries a chunk key', async ({ request }) => {
		const response = await request.get('/api/map/index.json');

		expect(response.ok()).toBe(true);

		const index = (await response.json()) as Array<MapApiItem>;

		expect(index.length).toBeGreaterThan(1000);
		expect(index.every((row) => typeof row[CHUNK_KEY] === 'string')).toBe(true);
	});

	test('sampled popup chunks resolve and contain their features', async ({ request }) => {
		const indexResponse = await request.get('/api/map/index.json');
		const index = (await indexResponse.json()) as Array<MapApiItem>;

		const sampled = [index.at(0), index.at(Math.floor(index.length / 2)), index.at(-1)];

		for (const row of sampled) {
			expect(row).toBeDefined();
			if (!row) continue;

			const response = await request.get(`/api/map/${String(row[CHUNK_KEY])}.json`);

			expect(response.ok()).toBe(true);

			const chunk = (await response.json()) as Array<MapApiItem>;

			expect(chunk.some((item) => item[ID] === row[ID])).toBe(true);
		}
	});

	test('warm list covers the index and every chunk in the index', async ({ request }) => {
		const manifestResponse = await request.get('/api/map/map-manifest.json');
		const warmUrls = (await manifestResponse.json()) as Array<string>;

		const indexResponse = await request.get('/api/map/index.json');
		const index = (await indexResponse.json()) as Array<MapApiItem>;

		const chunkKeys = new Set(index.map((row) => String(row[CHUNK_KEY])));

		expect(warmUrls.some((url) => url.startsWith('/api/map/index.json?v='))).toBe(true);
		for (const chunkKey of chunkKeys) {
			expect(warmUrls.some((url) => url.startsWith(`/api/map/${chunkKey}.json?v=`))).toBe(true);
		}
	});
});
