import { afterEach, describe, expect, test, vi } from 'vitest';

import { makeEntry } from '#lib/collections/collections-test-utils.ts';
import {
	createRegionContentFunction,
	createRegionsTree,
	getRegionHierarchy,
	getRegionLangCode,
} from '#lib/collections/regions/regions-factory.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';

function makeLocation(id: string, regionIds: Array<string>, data: Record<string, unknown> = {}) {
	return makeEntry('locations', id, {
		regions: regionIds.map((regionId) => ({ id: regionId })),
		...data,
	});
}

function makePost(id: string, regionIds?: Array<string>) {
	return makeEntry(
		'posts',
		id,
		regionIds === undefined ? {} : { regions: regionIds.map((regionId) => ({ id: regionId })) },
	);
}

function makeRegion(id: string, parent?: string) {
	return makeEntry('regions', id, parent === undefined ? {} : { parent });
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

describe('getRegionHierarchy', () => {
	test('ancestors are nearest-first with the root last', () => {
		const regionsTree = createRegionsTree(makeRegionsFixture());

		expect(getRegionHierarchy(regionsTree, 'taipei')._ancestors).toEqual([
			'north-taiwan',
			'taiwan',
		]);
	});

	test('children and siblings are id-sorted; empty groups are empty arrays', () => {
		const regionsTree = createRegionsTree(makeRegionsFixture());

		expect(getRegionHierarchy(regionsTree, 'taiwan')).toEqual({
			_ancestors: [],
			_children: ['north-taiwan', 'tainan'],
			_siblings: [],
		});
		expect(getRegionHierarchy(regionsTree, 'north-taiwan')._siblings).toEqual(['tainan']);
		expect(getRegionHierarchy(regionsTree, 'taipei')).toMatchObject({
			_children: [],
			_siblings: ['keelung'],
		});
	});
});

describe('getRegionLangCode', () => {
	test('a deep descendant takes the root language, not an intermediate ancestor', () => {
		const regions = [
			makeRegion('taiwan'),
			makeRegion('north-taiwan', 'taiwan'),
			makeRegion('taipei', 'north-taiwan'),
			makeRegion('daan', 'taipei'),
		];
		const { _ancestors } = getRegionHierarchy(createRegionsTree(regions), 'daan');

		// Only 'taiwan' carries a language; an ancestor one step in would answer undefined
		expect(_ancestors).toEqual(['taipei', 'north-taiwan', 'taiwan']);
		expect(getRegionLangCode(regions[3]!, _ancestors)).toBe(LanguageCodeEnum.ChineseTraditional);
	});

	test('roots use their own id; unmapped roots get no code', () => {
		expect(getRegionLangCode(makeRegion('taiwan'), [])).toBe(LanguageCodeEnum.ChineseTraditional);
		expect(getRegionLangCode(makeRegion('atlantis'), [])).toBeUndefined();
	});
});

describe('createRegionContentFunction', () => {
	test('rolls up locations and posts through descendants with dedupe', () => {
		const getRegionContent = createRegionContentFunction({
			locations: [makeLocation('temple', ['taipei', 'tainan']), makeLocation('fort', ['taipei'])],
			posts: [makePost('post-taipei', ['taipei']), makePost('post-taiwan', ['taiwan'])],
			regionsTree: createRegionsTree(makeRegionsFixture()),
		});

		const taiwan = getRegionContent('taiwan');
		const taipei = getRegionContent('taipei');
		const tainan = getRegionContent('tainan');

		// The temple sits in two subtrees of taiwan but is counted once
		expect(taiwan._locations).toEqual(['temple', 'fort']);
		expect(taiwan._locationCount).toBe(2);
		expect(taipei._locations).toEqual(['temple', 'fort']);
		expect(tainan._locations).toEqual(['temple']);

		expect(taiwan._posts).toEqual(['post-taiwan', 'post-taipei']);
		expect(taiwan._postCount).toBe(2);
		expect(taipei._posts).toEqual(['post-taipei']);
		expect(tainan._posts).toEqual([]);
		expect(tainan._postCount).toBe(0);
	});

	test('_entryCount totals every gathered collection', () => {
		const getRegionContent = createRegionContentFunction({
			locations: [makeLocation('temple', ['taipei'])],
			posts: [makePost('post-taipei', ['taipei'])],
			regionsTree: createRegionsTree(makeRegionsFixture()),
		});

		expect(getRegionContent('taiwan')._entryCount).toBe(2);
		expect(getRegionContent('tainan')._entryCount).toBe(0);
	});
});

// `contentPolicy` reads `import.meta.env.DEV` once at module load, so the policy-gated paths are
// only reachable through a fresh import, as `content-policy.test.ts` does
async function loadFactory(isDev: boolean) {
	vi.stubEnv('DEV', isDev);
	vi.resetModules();

	return import('#lib/collections/regions/regions-factory.ts');
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

async function taipeiCountsFor(isDev: boolean) {
	const { createRegionContentFunction, createRegionsTree } = await loadFactory(isDev);

	const getRegionContent = createRegionContentFunction({
		locations: [
			makeLocation('temple', ['taipei']),
			makeLocation('bunker', ['taipei'], { hideGeometry: true }),
			makeLocation('theater', ['taipei'], { hideFromLists: true }),
		],
		posts: [],
		regionsTree: createRegionsTree(makeRegionsFixture()),
	});

	return getRegionContent('taipei');
}

describe('createRegionContentFunction counts follow listings', () => {
	test('an unlisted Location is gathered but not counted; a geometry-hidden one counts', async () => {
		const taipei = await taipeiCountsFor(false);

		expect(taipei._locations).toEqual(['temple', 'bunker', 'theater']);
		expect(taipei._locationCount).toBe(2);
		expect(taipei._entryCount).toBe(2);
	});

	test('development counts the same, since listings are not gated on the environment', async () => {
		const taipei = await taipeiCountsFor(true);

		expect(taipei._locations).toEqual(['temple', 'bunker', 'theater']);
		expect(taipei._locationCount).toBe(2);
	});
});

async function overriddenLocationRegionsFor(isDev: boolean) {
	const { createRegionContentFunction, createRegionsTree } = await loadFactory(isDev);

	const getRegionContent = createRegionContentFunction({
		locations: [makeLocation('temple', ['taipei'], { override: { regions: [{ id: 'tainan' }] } })],
		posts: [],
		regionsTree: createRegionsTree(makeRegionsFixture()),
	});

	return {
		tainan: getRegionContent('tainan')._locations,
		taipei: getRegionContent('taipei')._locations,
	};
}

describe('Override regions under the content policy', () => {
	test('in production an override files the Location under its override regions', async () => {
		expect(await overriddenLocationRegionsFor(false)).toEqual({ tainan: ['temple'], taipei: [] });
	});

	test('in development the authored regions stand', async () => {
		expect(await overriddenLocationRegionsFor(true)).toEqual({ tainan: [], taipei: ['temple'] });
	});
});
