import type { CollectionEntry } from 'astro:content';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { getCollectionMock } = vi.hoisted(() => ({ getCollectionMock: vi.fn() }));

vi.mock('astro:content', () => ({ getCollection: getCollectionMock }));

// The raw collection cache is module scoped; every test needs its own module instance
async function importCollections() {
	return import('#lib/utils/collections.ts');
}

// Minimal fixtures; only the fields the factory reads, cast to the collection entry type
function makePost(id: string): CollectionEntry<'posts'> {
	return {
		collection: 'posts',
		data: { title: id },
		id,
	} as unknown as CollectionEntry<'posts'>;
}

function computeReplacedTitle(entry: CollectionEntry<'posts'>) {
	return { _flag: `computed-${entry.id}`, title: 'Replaced' };
}

function noop() {
	// Intentionally empty
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
	test('returns the store objects uncopied when there is no compute', async () => {
		const { createCollectionData } = await importCollections();

		const alpha = makePost('alpha');
		const beta = makePost('beta');

		getCollectionMock.mockResolvedValue([alpha, beta]);

		const result = await createCollectionData({ collection: 'posts' })();

		expect(result.entries[0]).toBe(alpha);
		expect(result.entriesMap.get('beta')).toBe(beta);
		expect([...result.entriesMap.keys()]).toEqual(['alpha', 'beta']);
	});

	test('merges computed fields onto copies and leaves the store untouched', async () => {
		const { createCollectionData } = await importCollections();

		const alpha = makePost('alpha');
		const snapshot = structuredClone(alpha);

		getCollectionMock.mockResolvedValue([alpha]);

		const getPostsCollection = createCollectionData({
			collection: 'posts',
			compute: () => computeReplacedTitle,
		});

		const result = await getPostsCollection();
		const computed = result.entriesMap.get('alpha');

		expect(computed?.data).toEqual({ _flag: 'computed-alpha', title: 'Replaced' });
		expect(computed).not.toBe(alpha);
		expect(alpha).toEqual(snapshot);
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
