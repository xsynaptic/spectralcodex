import type { CollectionEntry } from 'astro:content';

import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	createRegionsTree,
	populateRegionsContent,
	populateRegionsHierarchy,
	populateRegionsLangCode,
} from '#lib/collections/regions/regions-factory.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';

function makeLocation(id: string, regionIds: Array<string>): CollectionEntry<'locations'> {
	return {
		collection: 'locations',
		data: { regions: regionIds.map((regionId) => ({ id: regionId })), title: id },
		id,
	} as unknown as CollectionEntry<'locations'>;
}

function makePost(id: string, regionIds?: Array<string>): CollectionEntry<'posts'> {
	return {
		collection: 'posts',
		data: {
			title: id,
			...(regionIds === undefined
				? {}
				: { regions: regionIds.map((regionId) => ({ id: regionId })) }),
		},
		id,
	} as unknown as CollectionEntry<'posts'>;
}

// Minimal fixtures; only the fields the factory reads, cast to the collection entry type
function makeRegion(id: string, parent?: string): CollectionEntry<'regions'> {
	return {
		collection: 'regions',
		data: { title: id, ...(parent === undefined ? {} : { parent }) },
		id,
	} as unknown as CollectionEntry<'regions'>;
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
		// Empty groups remain undefined, not []
		expect(taipei.data._children).toBeUndefined();
		expect(taiwan.data._ancestors).toBeUndefined();
		expect(taiwan.data._siblings).toBeUndefined();
	});
});

describe('populateRegionsLangCode', () => {
	test('a deep descendant takes the root language, not an intermediate ancestor', () => {
		const regions = [
			makeRegion('taiwan'),
			makeRegion('north-taiwan', 'taiwan'),
			makeRegion('taipei', 'north-taiwan'),
			makeRegion('daan', 'taipei'),
		];

		populateRegionsHierarchy(regions, createRegionsTree(regions));
		populateRegionsLangCode(regions);

		const daan = regions.find((entry) => entry.id === 'daan')!;

		// Only 'taiwan' carries a language; an ancestor one step in would answer undefined
		expect(daan.data._ancestors).toEqual(['taipei', 'north-taiwan', 'taiwan']);
		expect(daan.data._langCode).toBe(LanguageCodeEnum.ChineseTraditional);
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
	test('rolls up locations and posts through descendants with dedupe', () => {
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

	test('_entryCount totals every gathered collection', () => {
		const regions = makeRegionsFixture();
		const regionsTree = createRegionsTree(regions);

		populateRegionsContent({
			entries: regions,
			locations: [makeLocation('temple', ['taipei'])],
			posts: [makePost('post-taipei', ['taipei'])],
			regionsTree,
		});

		const taiwan = regions.find((entry) => entry.id === 'taiwan')!;
		const tainan = regions.find((entry) => entry.id === 'tainan')!;

		expect(taiwan.data._entryCount).toBe(2);
		expect(tainan.data._entryCount).toBe(0);
	});
});

// `contentPolicy` reads `import.meta.env.DEV` once at module load, so the policy-gated paths are
// only reachable through a fresh import, as `content-policy.test.ts` does
async function loadFactory(isDev: boolean) {
	vi.stubEnv('DEV', isDev);
	vi.resetModules();

	return import('#lib/collections/regions/regions-factory.ts');
}

function makeOverrideLocation(
	id: string,
	regionIds: Array<string>,
	overrideRegionIds: Array<string>,
) {
	return {
		collection: 'locations',
		data: {
			override: { regions: overrideRegionIds.map((regionId) => ({ id: regionId })) },
			regions: regionIds.map((regionId) => ({ id: regionId })),
			title: id,
		},
		id,
	} as unknown as CollectionEntry<'locations'>;
}

function makeSensitiveLocation(id: string, regionIds: Array<string>) {
	return {
		collection: 'locations',
		data: {
			hideLocation: true,
			regions: regionIds.map((regionId) => ({ id: regionId })),
			title: id,
		},
		id,
	} as unknown as CollectionEntry<'locations'>;
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

async function taipeiCountsFor(isDev: boolean) {
	const { createRegionsTree, populateRegionsContent } = await loadFactory(isDev);
	const regions = makeRegionsFixture();

	populateRegionsContent({
		entries: regions,
		locations: [makeLocation('temple', ['taipei']), makeSensitiveLocation('bunker', ['taipei'])],
		posts: [],
		regionsTree: createRegionsTree(regions),
	});

	return regions.find((entry) => entry.id === 'taipei')!.data;
}

describe('populateRegionsContent under the production content policy', () => {
	test('a sensitive location is gathered but not counted', async () => {
		const taipei = await taipeiCountsFor(false);

		expect(taipei._locations).toEqual(['temple', 'bunker']);
		expect(taipei._locationCount).toBe(1);
		expect(taipei._entryCount).toBe(1);
	});

	test('in development it counts like any other location', async () => {
		const taipei = await taipeiCountsFor(true);

		expect(taipei._locations).toEqual(['temple', 'bunker']);
		expect(taipei._locationCount).toBe(2);
	});
});

const overriddenLocation = () => makeOverrideLocation('temple', ['taipei'], ['tainan']);

describe('resolveLocationRegions under the production content policy', () => {
	test('an override replaces the authored regions', async () => {
		const { resolveLocationRegions } = await loadFactory(false);

		expect(resolveLocationRegions(overriddenLocation())).toEqual([{ id: 'tainan' }]);
	});

	test('in development the authored regions stand', async () => {
		const { resolveLocationRegions } = await loadFactory(true);

		expect(resolveLocationRegions(overriddenLocation())).toEqual([{ id: 'taipei' }]);
	});
});
