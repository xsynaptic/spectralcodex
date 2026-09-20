import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { extractBuiltFilenames } from '#og-image/built-entries.ts';
import { resolveEntry, resolveOgRegions } from '#og-image/content.ts';
import { makeOgEntry } from '#og-image/og-image-test-utils.ts';

function ogImageMeta(url: string) {
	return `<meta property="og:image" content="${url}" />`;
}

describe('resolveEntry', () => {
	const contentEntry = makeOgEntry({ collection: 'posts', id: 'a-post' });
	const indexEntry = makeOgEntry({ collection: 'index', id: 'index-posts', isFallback: true });

	const contentEntries = new Map([[contentEntry.id, contentEntry]]);
	const indexEntries = new Map([[indexEntry.id, indexEntry]]);
	const chronologyImageIndex = new Map([['2020', 'chronology/2020-derived.jpg']]);

	function resolve(filename: string) {
		return resolveEntry({ chronologyImageIndex, contentEntries, filename, indexEntries });
	}

	test('content entries win first', () => {
		expect(resolve('a-post')).toBe(contentEntry);
	});

	test('falls through to index entries', () => {
		expect(resolve('index-posts')).toBe(indexEntry);
	});

	test('a content id shaped like a chronology period is not synthesized', () => {
		const withYear = new Map([['2020', contentEntry]]);

		expect(
			resolveEntry({
				chronologyImageIndex,
				contentEntries: withYear,
				filename: '2020',
				indexEntries,
			}),
		).toBe(contentEntry);
	});

	test('synthesizes a YYYY chronology entry with its derived image', () => {
		expect(resolve('2020')).toEqual({
			collection: ContentCollectionsEnum.Chronology,
			digest: 'chronology-2020',
			id: '2020',
			imageFeaturedId: 'chronology/2020-derived.jpg',
			isFallback: false,
			title: 'Chronology: 2020',
		});
	});

	test('synthesizes a YYYY-MM chronology entry with a month title and fallback image', () => {
		const result = resolve('2019-03');

		expect(result).toMatchObject({
			collection: ContentCollectionsEnum.Chronology,
			digest: 'chronology-2019-03',
			id: '2019-03',
			isFallback: true,
			title: 'Chronology: March 2019',
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
	return ids.map((id) => ({ collection: ContentCollectionsEnum.Regions, id }));
}

describe('resolveOgRegions', () => {
	test('resolves raw regions when there is no override', () => {
		expect(resolveOgRegions({ regions: makeRegionRefs(['taipei']) })).toEqual(['taipei']);
	});

	test('override regions win over raw regions', () => {
		expect(
			resolveOgRegions({
				override: { regions: makeRegionRefs(['taiwan']) },
				regions: makeRegionRefs(['taipei']),
			}),
		).toEqual(['taiwan']);
	});

	test('an override without regions falls back to raw regions', () => {
		expect(
			resolveOgRegions({
				override: { title: 'Sanitized Title' },
				regions: makeRegionRefs(['taipei']),
			}),
		).toEqual(['taipei']);
	});

	test('an empty override regions array falls back to raw regions', () => {
		expect(
			resolveOgRegions({
				override: { regions: [] },
				regions: makeRegionRefs(['taipei']),
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
		rmSync(distPath, { force: true, recursive: true });
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
