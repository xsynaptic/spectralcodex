import { expect, test } from '@playwright/test';
import { MapDataKeysCompressed } from '@spectralcodex/map-codec';

const ID = MapDataKeysCompressed.Id;
const CHUNK_KEY = MapDataKeysCompressed.ChunkKey;

type MapApiItem = Record<string, unknown>;

test.describe('map data API', () => {
	test('global directory is built and every row carries a chunk key', async ({ request }) => {
		const response = await request.get('/api/map/map-directory.json');

		expect(response.ok()).toBe(true);

		const directory = (await response.json()) as Array<MapApiItem>;

		expect(directory.length).toBeGreaterThan(1000);
		expect(directory.every((row) => typeof row[CHUNK_KEY] === 'string')).toBe(true);
	});

	test('sampled popup chunks resolve and contain their features', async ({ request }) => {
		const directoryResponse = await request.get('/api/map/map-directory.json');
		const directory = (await directoryResponse.json()) as Array<MapApiItem>;

		const sampled = [
			directory.at(0),
			directory.at(Math.floor(directory.length / 2)),
			directory.at(-1),
		];

		for (const row of sampled) {
			expect(row).toBeDefined();
			if (!row) continue;

			const response = await request.get(`/api/map/${String(row[CHUNK_KEY])}.json`);

			expect(response.ok()).toBe(true);

			const chunk = (await response.json()) as Array<MapApiItem>;

			expect(chunk.some((item) => item[ID] === row[ID])).toBe(true);
		}
	});

	test('warm list covers the directory and every chunk in the directory', async ({ request }) => {
		const manifestResponse = await request.get('/api/map/map-manifest.json');
		const warmUrls = (await manifestResponse.json()) as Array<string>;

		const directoryResponse = await request.get('/api/map/map-directory.json');
		const directory = (await directoryResponse.json()) as Array<MapApiItem>;

		const chunkKeys = new Set(directory.map((row) => String(row[CHUNK_KEY])));

		expect(warmUrls.some((url) => url.startsWith('/api/map/map-directory.json?v='))).toBe(true);
		for (const chunkKey of chunkKeys) {
			expect(warmUrls.some((url) => url.startsWith(`/api/map/${chunkKey}.json?v=`))).toBe(true);
		}
	});
});
