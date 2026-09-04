import type { CollectionEntry } from 'astro:content';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { getCollectionMock } = vi.hoisted(() => ({ getCollectionMock: vi.fn() }));

vi.mock('astro:content', () => ({ getCollection: getCollectionMock }));

// Minimal fixtures; only the fields the factory reads, cast to the collection entry type
function makePost(id: string): CollectionEntry<'posts'> {
	return {
		id,
		collection: 'posts',
		data: { title: id },
	} as unknown as CollectionEntry<'posts'>;
}

function noop() {
	// Intentionally empty
}

// The raw collection cache is module scoped; every test needs its own module instance
async function importCollections() {
	return import('#lib/utils/collections.ts');
}

beforeEach(() => {
	vi.resetModules();
	getCollectionMock.mockReset();
	vi.spyOn(console, 'log').mockImplementation(noop);
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('createCollectionData', () => {
	test('memoizes a non-empty result across sequential calls', async () => {
		const { createCollectionData } = await importCollections();

		getCollectionMock.mockResolvedValue([makePost('alpha')]);

		const getPostsCollection = createCollectionData({ collection: 'posts' });

		await getPostsCollection();
		await getPostsCollection();

		expect(getCollectionMock).toHaveBeenCalledTimes(1);
	});

	test('memoizes across concurrent calls', async () => {
		const { createCollectionData } = await importCollections();

		getCollectionMock.mockResolvedValue([makePost('alpha')]);

		const getPostsCollection = createCollectionData({ collection: 'posts' });

		await Promise.all([getPostsCollection(), getPostsCollection(), getPostsCollection()]);

		expect(getCollectionMock).toHaveBeenCalledTimes(1);
	});

	test('keys entriesMap by id and shares entry objects with mutate', async () => {
		const { createCollectionData } = await importCollections();

		const alpha = makePost('alpha');
		const beta = makePost('beta');

		getCollectionMock.mockResolvedValue([alpha, beta]);

		const mutateCalls: Array<
			[Array<CollectionEntry<'posts'>>, Map<string, CollectionEntry<'posts'>>]
		> = [];

		const getPostsCollection = createCollectionData({
			collection: 'posts',
			mutate: (entries, entriesMap) => {
				mutateCalls.push([entries, entriesMap]);
			},
		});

		const result = await getPostsCollection();

		expect(mutateCalls).toHaveLength(1);

		const [mutatedEntries, mutatedEntriesMap] = mutateCalls[0]!;

		expect(mutatedEntries[0]).toBe(alpha);
		expect(mutatedEntriesMap.get('alpha')).toBe(alpha);
		expect(mutatedEntriesMap.get('beta')).toBe(beta);
		expect(result.entries[0]).toBe(alpha);
		expect(result.entriesMap.get('alpha')).toBe(alpha);
		expect([...result.entriesMap.keys()]).toEqual(['alpha', 'beta']);
	});

	test('runs mutate before extend and merges the extend artifact top level', async () => {
		const { createCollectionData } = await importCollections();

		getCollectionMock.mockResolvedValue([makePost('alpha')]);

		const getPostsCollection = createCollectionData({
			collection: 'posts',
			mutate: (entries) => {
				for (const entry of entries) {
					Object.assign(entry.data, { _flag: 'mutated' });
				}
			},
			extend: (entries) => ({
				flagSeenByExtend: (entries[0]?.data as { _flag?: string } | undefined)?._flag,
			}),
		});

		const result = await getPostsCollection();

		expect(result.flagSeenByExtend).toBe('mutated');
	});

	test('evicts an empty result in dev so the next call refetches', async () => {
		vi.stubEnv('DEV', true);

		const { createCollectionData } = await importCollections();

		getCollectionMock.mockResolvedValueOnce([]).mockResolvedValueOnce([makePost('alpha')]);

		const getPostsCollection = createCollectionData({ collection: 'posts' });

		const empty = await getPostsCollection();
		const recovered = await getPostsCollection();

		expect(empty.entries).toHaveLength(0);
		expect(recovered.entries).toHaveLength(1);
		expect(getCollectionMock).toHaveBeenCalledTimes(2);
	});

	test('keeps an empty result memoized outside dev', async () => {
		vi.stubEnv('DEV', false);

		const { createCollectionData } = await importCollections();

		getCollectionMock.mockResolvedValue([]);

		const getPostsCollection = createCollectionData({ collection: 'posts' });

		await getPostsCollection();
		await getPostsCollection();

		expect(getCollectionMock).toHaveBeenCalledTimes(1);
	});
});

describe('getRawCollection', () => {
	test('caches the in-flight promise across concurrent and later calls', async () => {
		const { getRawCollection } = await importCollections();

		getCollectionMock.mockResolvedValue([makePost('alpha')]);

		await Promise.all([getRawCollection('posts'), getRawCollection('posts')]);
		await getRawCollection('posts');

		expect(getCollectionMock).toHaveBeenCalledTimes(1);
	});

	test('evicts an empty result in dev so the next call refetches', async () => {
		vi.stubEnv('DEV', true);

		const { getRawCollection } = await importCollections();

		getCollectionMock.mockResolvedValueOnce([]).mockResolvedValueOnce([makePost('alpha')]);

		const empty = await getRawCollection('posts');
		const recovered = await getRawCollection('posts');

		expect(empty).toHaveLength(0);
		expect(recovered).toHaveLength(1);
		expect(getCollectionMock).toHaveBeenCalledTimes(2);
	});
});
