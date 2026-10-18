import { expect, test } from '@playwright/test';
import { MapSourceItemSchema, mapSourceKeys } from '@spectralcodex/map-codec';

const id = mapSourceKeys.id;
const chunkKey = mapSourceKeys.chunkKey;
const objective = mapSourceKeys.objective;

type MapApiItem = Record<string, unknown>;

test.describe('map data API', { tag: '@smoke' }, () => {
	test('the global directory decodes, every row has a Chunk, and no row carries an Objective', async ({
		request,
	}) => {
		const response = await request.get('/api/map/map-directory.json');

		expect(response.ok()).toBe(true);

		const directory = (await response.json()) as Array<MapApiItem>;

		expect(directory.length).toBeGreaterThan(1000);
		expect(directory.every((row) => typeof row[chunkKey] === 'string')).toBe(true);
		expect(directory.filter((row) => Object.hasOwn(row, objective))).toHaveLength(0);
		expect(() => MapSourceItemSchema.array().parse(directory)).not.toThrow();
	});

	test('the warm list includes the directory and every Chunk, and sampled Chunks contain their rows', async ({
		request,
	}) => {
		const [manifestResponse, directoryResponse] = await Promise.all([
			request.get('/api/map/map-manifest.json'),
			request.get('/api/map/map-directory.json'),
		]);
		const warmUrls = (await manifestResponse.json()) as Array<string>;
		const directory = (await directoryResponse.json()) as Array<MapApiItem>;
		const chunkKeys = new Set(directory.map((row) => String(row[chunkKey])));

		expect(warmUrls.some((url) => url.startsWith('/api/map/map-directory.json?v='))).toBe(true);
		for (const chunkKey of chunkKeys) {
			expect(warmUrls.some((url) => url.startsWith(`/api/map/${chunkKey}.json?v=`))).toBe(true);
		}

		const sampled = [
			directory.at(0),
			directory.at(Math.floor(directory.length / 2)),
			directory.at(-1),
		];

		for (const row of sampled) {
			expect(row).toBeDefined();
			if (!row) continue;

			const response = await request.get(`/api/map/${String(row[chunkKey])}.json`);

			expect(response.ok()).toBe(true);

			const chunk = (await response.json()) as Array<MapApiItem>;

			expect(chunk.some((item) => item[id] === row[id])).toBe(true);
		}
	});
});
