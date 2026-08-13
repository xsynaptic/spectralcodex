import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { OpenGraphContentEntry } from './types';

import {
	buildIndexEntries,
	extractBuiltFilenames,
	resolveEntry,
	resolveOgRegions,
} from './content';

function makeOgEntry(overrides: Partial<OpenGraphContentEntry> = {}): OpenGraphContentEntry {
	return {
		id: 'entry',
		collection: 'posts',
		digest: 'digest',
		title: 'Title',
		imageFeaturedId: 'image/entry.jpg',
		isFallback: false,
		...overrides,
	};
}

function ogImageMeta(url: string) {
	return `<meta property="og:image" content="${url}" />`;
}

describe('buildIndexEntries', () => {
	const entries = buildIndexEntries();

	test('resolves a non-empty fallback image id for every index', () => {
		for (const entry of entries.values()) {
			expect(entry.imageFeaturedId.length).toBeGreaterThan(0);
		}
	});
});

describe('resolveEntry', () => {
	const dataStoreEntry = makeOgEntry({ id: 'a-post', collection: 'posts' });
	const indexEntry = makeOgEntry({ id: 'index-posts', collection: 'index', isFallback: true });

	const dataStoreEntries = new Map([[dataStoreEntry.id, dataStoreEntry]]);
	const indexEntries = new Map([[indexEntry.id, indexEntry]]);
	const chronologyImageIndex = new Map([['2020', 'chronology/2020-derived.jpg']]);

	function resolve(filename: string) {
		return resolveEntry({ filename, dataStoreEntries, indexEntries, chronologyImageIndex });
	}

	test('data store wins first', () => {
		expect(resolve('a-post')).toBe(dataStoreEntry);
	});

	test('falls through to index entries', () => {
		expect(resolve('index-posts')).toBe(indexEntry);
	});

	test('a data-store id shaped like a chronology period is not synthesized', () => {
		const withYear = new Map([['2020', dataStoreEntry]]);

		expect(
			resolveEntry({
				filename: '2020',
				dataStoreEntries: withYear,
				indexEntries,
				chronologyImageIndex,
			}),
		).toBe(dataStoreEntry);
	});

	test('synthesizes a YYYY chronology entry with its derived image', () => {
		expect(resolve('2020')).toEqual({
			id: '2020',
			collection: ContentCollectionsEnum.Chronology,
			digest: 'chronology-2020',
			title: 'Chronology: 2020',
			imageFeaturedId: 'chronology/2020-derived.jpg',
			isFallback: false,
		});
	});

	test('synthesizes a YYYY-MM chronology entry with a month title and fallback image', () => {
		const result = resolve('2019-03');

		expect(result).toMatchObject({
			id: '2019-03',
			collection: ContentCollectionsEnum.Chronology,
			digest: 'chronology-2019-03',
			title: 'Chronology: March 2019',
			isFallback: true,
		});
		expect(result?.imageFeaturedId.length).toBeGreaterThan(0);
	});

	test.each(['201', '2019-3', '2019-03-01', 'abcd', 'index-unknown'])(
		'returns undefined for non-chronology filename %s',
		(filename) => {
			expect(resolve(filename)).toBeUndefined();
		},
	);
});

function makeRegionRefs(ids: Array<string>) {
	return ids.map((id) => ({ id, collection: ContentCollectionsEnum.Regions }));
}

describe('resolveOgRegions', () => {
	test('resolves raw regions when there is no override', () => {
		expect(resolveOgRegions({ regions: makeRegionRefs(['taipei']) })).toEqual(['taipei']);
	});

	test('override regions win over raw regions', () => {
		expect(
			resolveOgRegions({
				regions: makeRegionRefs(['taipei']),
				override: { regions: makeRegionRefs(['taiwan']) },
			}),
		).toEqual(['taiwan']);
	});

	test('an override without regions falls back to raw regions', () => {
		expect(
			resolveOgRegions({
				regions: makeRegionRefs(['taipei']),
				override: { title: 'Sanitized Title' },
			}),
		).toEqual(['taipei']);
	});

	test('an empty override regions array falls back to raw regions', () => {
		expect(
			resolveOgRegions({
				regions: makeRegionRefs(['taipei']),
				override: { regions: [] },
			}),
		).toEqual(['taipei']);
	});

	test('returns an empty array when nothing is set', () => {
		expect(resolveOgRegions({})).toEqual([]);
	});
});

describe('extractBuiltFilenames', () => {
	let distPath: string;

	beforeEach(() => {
		distPath = mkdtempSync(path.join(tmpdir(), 'og-dist-'));
	});

	afterEach(() => {
		rmSync(distPath, { recursive: true, force: true });
	});

	function writeHtml(relPath: string, body: string) {
		const fullPath = path.join(distPath, relPath);

		mkdirSync(path.dirname(fullPath), { recursive: true });
		writeFileSync(fullPath, body);
	}

	test('extracts the og image id, stripping the extension', () => {
		writeHtml('index.html', ogImageMeta('https://example.com/og/homepage.jpg'));

		expect([...extractBuiltFilenames(distPath)]).toEqual(['homepage']);
	});

	test('dedupes repeated ids and walks nested directories', () => {
		writeHtml('a/index.html', ogImageMeta('https://example.com/og/shared.jpg'));
		writeHtml(
			'b/index.html',
			ogImageMeta('https://example.com/og/shared.jpg') +
				ogImageMeta('https://example.com/og/other.jpg'),
		);

		expect([...extractBuiltFilenames(distPath)].sort((a, b) => a.localeCompare(b))).toEqual([
			'other',
			'shared',
		]);
	});

	test('ignores og images outside the og path and non-html files', () => {
		writeHtml('page.html', ogImageMeta('https://cdn.example.com/images/not-og.jpg'));
		writeHtml('data.json', ogImageMeta('https://example.com/og/ignored.jpg'));

		expect([...extractBuiltFilenames(distPath)]).toEqual([]);
	});
});
