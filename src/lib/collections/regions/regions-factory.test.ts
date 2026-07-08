import type { CollectionEntry } from 'astro:content';

import { describe, expect, test } from 'vitest';

import {
	applyComputedDataCache,
	createRegionsTree,
	extractComputedData,
	generateCacheKey,
	populateRegionsContent,
	populateRegionsHierarchy,
	populateRegionsLangCode,
} from '#lib/collections/regions/regions-factory.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';

// Minimal fixtures; only the fields the factory reads, cast to the collection entry type
function makeRegion(id: string, parent?: string): CollectionEntry<'regions'> {
	return {
		id,
		collection: 'regions',
		data: { title: id, ...(parent === undefined ? {} : { parent }) },
	} as unknown as CollectionEntry<'regions'>;
}

function makeLocation(id: string, regionIds: Array<string>): CollectionEntry<'locations'> {
	return {
		id,
		collection: 'locations',
		data: { title: id, regions: regionIds.map((regionId) => ({ id: regionId })) },
	} as unknown as CollectionEntry<'locations'>;
}

function makePost(id: string, regionIds?: Array<string>): CollectionEntry<'posts'> {
	return {
		id,
		collection: 'posts',
		data: {
			title: id,
			...(regionIds === undefined
				? {}
				: { regions: regionIds.map((regionId) => ({ id: regionId })) }),
		},
	} as unknown as CollectionEntry<'posts'>;
}

// taiwan > north-taiwan > (keelung, taipei); tainan directly under taiwan
function makeRegionsFixture() {
	return [
		makeRegion('taiwan'),
		makeRegion('north-taiwan', 'taiwan'),
		makeRegion('taipei', 'north-taiwan'),
		makeRegion('keelung', 'north-taiwan'),
		makeRegion('tainan', 'taiwan'),
	];
}

describe('createRegionsTree', () => {
	test('throws when a region is its own parent', () => {
		expect(() => createRegionsTree([makeRegion('loop', 'loop')])).toThrow(
			'region "loop" cannot be its own parent',
		);
	});
});

describe('populateRegionsHierarchy', () => {
	test('ancestors are nearest-first with the root last', () => {
		const regions = makeRegionsFixture();

		populateRegionsHierarchy(regions, createRegionsTree(regions));

		const taipei = regions.find((entry) => entry.id === 'taipei')!;

		expect(taipei.data._ancestors).toEqual(['north-taiwan', 'taiwan']);
	});

	test('children and siblings are id-sorted; empty groups stay unset', () => {
		const regions = makeRegionsFixture();

		populateRegionsHierarchy(regions, createRegionsTree(regions));

		const taiwan = regions.find((entry) => entry.id === 'taiwan')!;
		const northTaiwan = regions.find((entry) => entry.id === 'north-taiwan')!;
		const taipei = regions.find((entry) => entry.id === 'taipei')!;

		expect(taiwan.data._children).toEqual(['north-taiwan', 'tainan']);
		expect(northTaiwan.data._siblings).toEqual(['tainan']);
		expect(taipei.data._siblings).toEqual(['keelung']);
		// Leaf with no children and root with no ancestors remain undefined, not []
		expect(taipei.data._children).toBeUndefined();
		expect(taiwan.data._ancestors).toBeUndefined();
	});
});

describe('populateRegionsLangCode', () => {
	test('descendants take the language of their root ancestor', () => {
		const regions = makeRegionsFixture();

		populateRegionsHierarchy(regions, createRegionsTree(regions));
		populateRegionsLangCode(regions);

		const taipei = regions.find((entry) => entry.id === 'taipei')!;

		expect(taipei.data._langCode).toBe(LanguageCodeEnum.ChineseTraditional);
	});

	test('roots use their own id; unmapped roots get no code', () => {
		const regions = [makeRegion('taiwan'), makeRegion('atlantis')];

		populateRegionsHierarchy(regions, createRegionsTree(regions));
		populateRegionsLangCode(regions);

		expect(regions[0]!.data._langCode).toBe(LanguageCodeEnum.ChineseTraditional);
		expect(regions[1]!.data._langCode).toBeUndefined();
	});
});

describe('populateRegionsContent', () => {
	test('rolls up locations and posts through descendants with dedup', () => {
		const regions = makeRegionsFixture();
		const regionsTree = createRegionsTree(regions);
		const locations = [
			makeLocation('temple', ['taipei', 'tainan']),
			makeLocation('fort', ['taipei']),
		];
		const posts = [makePost('post-taipei', ['taipei']), makePost('post-taiwan', ['taiwan'])];

		populateRegionsContent({ entries: regions, locations, posts, regionsTree });

		const taiwan = regions.find((entry) => entry.id === 'taiwan')!;
		const taipei = regions.find((entry) => entry.id === 'taipei')!;
		const tainan = regions.find((entry) => entry.id === 'tainan')!;

		// The temple sits in two subtrees of taiwan but is counted once
		expect(taiwan.data._locations).toEqual(['temple', 'fort']);
		expect(taiwan.data._locationCount).toBe(2);
		expect(taipei.data._locations).toEqual(['temple', 'fort']);
		expect(tainan.data._locations).toEqual(['temple']);

		expect(taiwan.data._posts).toEqual(['post-taiwan', 'post-taipei']);
		expect(taiwan.data._postCount).toBe(2);
		expect(taipei.data._posts).toEqual(['post-taipei']);
		expect(tainan.data._posts).toEqual([]);
		expect(tainan.data._postCount).toBe(0);
	});
});

describe('generateCacheKey', () => {
	const regions = makeRegionsFixture();
	const locations = [makeLocation('temple', ['taipei'])];
	const posts = [makePost('post-taipei', ['taipei'])];

	test('is stable for identical inputs', () => {
		expect(generateCacheKey({ regions, locations, posts })).toBe(
			generateCacheKey({ regions, locations, posts }),
		);
	});

	test('changes when any region, location, or post relationship changes', () => {
		const baseKey = generateCacheKey({ regions, locations, posts });

		expect(
			generateCacheKey({
				regions: [...makeRegionsFixture().slice(0, 4), makeRegion('tainan', 'north-taiwan')],
				locations,
				posts,
			}),
		).not.toBe(baseKey);
		expect(
			generateCacheKey({ regions, locations: [makeLocation('temple', ['tainan'])], posts }),
		).not.toBe(baseKey);
		expect(
			generateCacheKey({ regions, locations, posts: [makePost('post-taipei', ['taiwan'])] }),
		).not.toBe(baseKey);
	});
});

describe('computed data cache round-trip', () => {
	test('extract then apply reproduces the computed fields on fresh entries', () => {
		const regions = makeRegionsFixture();
		const regionsTree = createRegionsTree(regions);
		const locations = [makeLocation('temple', ['taipei'])];
		const posts = [makePost('post-taipei', ['taipei'])];

		populateRegionsHierarchy(regions, regionsTree);
		populateRegionsLangCode(regions);
		populateRegionsContent({ entries: regions, locations, posts, regionsTree });

		const freshRegions = makeRegionsFixture();

		applyComputedDataCache(freshRegions, extractComputedData(regions));

		for (const [index, entry] of regions.entries()) {
			expect(freshRegions[index]!.data).toEqual(entry.data);
		}
	});
});
