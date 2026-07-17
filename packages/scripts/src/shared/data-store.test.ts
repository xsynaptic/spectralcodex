import * as devalue from 'devalue';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { DataStoreCollections, DataStoreEntry } from './data-store';

import { loadDataStore } from './data-store';

function makeCollections(): DataStoreCollections {
	const collections: DataStoreCollections = new Map();

	const locations = new Map<string, DataStoreEntry>([
		['alpha', { id: 'alpha', data: { title: 'Alpha' } }],
		['beta', { id: 'beta', data: { title: 'Beta' } }],
	]);
	const regions = new Map<string, DataStoreEntry>([
		['north', { id: 'north', data: { parent: undefined } }],
		['north-city', { id: 'north-city', data: { parent: 'north' } }],
	]);

	collections.set('locations', locations);
	collections.set('regions', regions);

	return collections;
}

function writeSingleStore(cacheDir: string, collections: DataStoreCollections): string {
	const filePath = path.join(cacheDir, 'data-store.json');

	writeFileSync(filePath, devalue.stringify(collections));

	return filePath;
}

// Mirrors Astro's ChunkedWriter: one devalue payload per collection, split into chunkParts files
function writeChunkedStore(
	cacheDir: string,
	collections: DataStoreCollections,
	chunkParts = 1,
): string {
	const dirPath = path.join(cacheDir, 'data-store');

	mkdirSync(dirPath, { recursive: true });

	const manifest: Record<string, Array<string>> = {};

	for (const [collectionName, entries] of collections) {
		const serialized = devalue.stringify(entries);
		const partSize = Math.ceil(serialized.length / chunkParts);
		const parts: Array<string> = [];

		for (let index = 0; index < chunkParts; index++) {
			const fileName = `${collectionName}-${String(index)}.txt`;

			writeFileSync(
				path.join(dirPath, fileName),
				serialized.slice(index * partSize, (index + 1) * partSize),
			);
			parts.push(fileName);
		}

		manifest[collectionName] = parts;
	}

	writeFileSync(path.join(dirPath, 'manifest.json'), JSON.stringify(manifest));

	return dirPath;
}

describe('loadDataStore', () => {
	let cacheDir: string;

	beforeEach(() => {
		cacheDir = mkdtempSync(path.join(os.tmpdir(), 'data-store-test-'));
	});

	afterEach(() => {
		rmSync(cacheDir, { recursive: true, force: true });
	});

	test('loads the single-file layout', () => {
		const filePath = writeSingleStore(cacheDir, makeCollections());

		const result = loadDataStore(filePath);

		expect(result.path).toBe(filePath);
		expect(result.collections.get('locations')?.get('alpha')?.data.title).toBe('Alpha');
		expect(result.regionParentMap.get('north-city')).toBe('north');
	});

	test('loads the chunked layout, reassembling multi-part collections', () => {
		const dirPath = writeChunkedStore(cacheDir, makeCollections(), 3);

		const result = loadDataStore(path.join(cacheDir, 'data-store.json'));

		expect(result.path).toBe(dirPath);
		expect(result.collections.get('locations')?.size).toBe(2);
		expect(result.collections.get('locations')?.get('beta')?.data.title).toBe('Beta');
		expect(result.regionParentMap.get('north-city')).toBe('north');
	});

	test('prefers the more recently written layout when both exist', () => {
		const filePath = writeSingleStore(cacheDir, makeCollections());
		const dirPath = writeChunkedStore(cacheDir, makeCollections());

		const older = new Date(Date.now() - 60_000);
		const newer = new Date();

		utimesSync(filePath, older, older);
		utimesSync(path.join(dirPath, 'manifest.json'), newer, newer);

		expect(loadDataStore(filePath).path).toBe(dirPath);

		utimesSync(filePath, newer, newer);
		utimesSync(path.join(dirPath, 'manifest.json'), older, older);

		expect(loadDataStore(filePath).path).toBe(filePath);
	});

	test('throws when neither layout exists', () => {
		expect(() => loadDataStore(path.join(cacheDir, 'data-store.json'))).toThrow(
			/Data store not found/,
		);
	});
});
