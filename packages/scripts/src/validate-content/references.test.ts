import { describe, expect, test, vi } from 'vitest';

import { checkReferences, collectReferenceIssues } from './references';
import { makeCollections, makeEntry, makeRefs, noop } from './validate-test-utils';

const collectionNames = ['locations', 'regions', 'themes'];

function makeStore(locations: Array<ReturnType<typeof makeEntry>>) {
	return makeCollections({
		locations,
		regions: [makeEntry({ id: 'taipei' })],
		themes: [makeEntry({ id: 'ruins' })],
	});
}

describe('collectReferenceIssues', () => {
	test('accepts references that resolve', () => {
		const collections = makeStore([
			makeEntry({
				id: 'some-place',
				data: { regions: makeRefs('regions', ['taipei']), themes: makeRefs('themes', ['ruins']) },
			}),
		]);

		expect(collectReferenceIssues(collections, collectionNames)).toEqual([]);
	});

	test('flags a reference to a missing entry and reports its field path', () => {
		const collections = makeStore([
			makeEntry({
				id: 'some-place',
				filePath: 'locations/some-place.mdx',
				data: { regions: makeRefs('regions', ['taipei', 'atlantis']) },
			}),
		]);

		expect(collectReferenceIssues(collections, collectionNames)).toEqual([
			{
				location: 'locations/some-place.mdx',
				field: 'regions[1]',
				collection: 'regions',
				id: 'atlantis',
			},
		]);
	});

	test('flags a reference whose target exists in a different collection', () => {
		const collections = makeStore([
			makeEntry({ id: 'some-place', data: { regions: makeRefs('regions', ['ruins']) } }),
		]);

		expect(collectReferenceIssues(collections, collectionNames)).toEqual([
			{ location: 'some-place', field: 'regions[0]', collection: 'regions', id: 'ruins' },
		]);
	});

	test('walks nested objects', () => {
		const collections = makeStore([
			makeEntry({
				id: 'some-place',
				data: { override: { regions: makeRefs('regions', ['atlantis']) } },
			}),
		]);

		expect(collectReferenceIssues(collections, collectionNames)).toEqual([
			{
				location: 'some-place',
				field: 'override.regions[0]',
				collection: 'regions',
				id: 'atlantis',
			},
		]);
	});

	test('ignores references into collections outside the checked set', () => {
		const collections = makeStore([
			makeEntry({ id: 'some-place', data: { images: makeRefs('images', ['missing.jpg']) } }),
		]);

		expect(collectReferenceIssues(collections, collectionNames)).toEqual([]);
	});

	test('ignores plain data that is not a reference', () => {
		const collections = makeStore([
			makeEntry({
				id: 'some-place',
				data: { title: 'Some Place', geometry: [121.5, 25.05], links: [{ url: 'https://x.test' }] },
			}),
		]);

		expect(collectReferenceIssues(collections, collectionNames)).toEqual([]);
	});

	test('throws on an unknown collection name', () => {
		expect(() => collectReferenceIssues(makeStore([]), ['nope'])).toThrow('Unknown collection');
	});
});

describe('checkReferences', () => {
	test('fails on broken references', () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(noop);

		const broken = makeStore([
			makeEntry({ id: 'some-place', data: { regions: makeRefs('regions', ['atlantis']) } }),
		]);
		const valid = makeStore([
			makeEntry({ id: 'some-place', data: { regions: makeRefs('regions', ['taipei']) } }),
		]);

		expect(checkReferences(broken, collectionNames)).toBe(false);
		expect(checkReferences(valid, collectionNames)).toBe(true);

		logSpy.mockRestore();
	});
});
