import { describe, expect, test } from 'vitest';

import { collectReferenceIssues } from './references.ts';
import { makeEntry, makeRefs } from './validate-test-utils.ts';

// The checked set is whatever collections the passed entries belong to
function makeEntries(locations: Array<ReturnType<typeof makeEntry>>) {
	return [
		...locations,
		makeEntry({ id: 'taipei', collection: 'regions' }),
		makeEntry({ id: 'ruins', collection: 'themes' }),
	];
}

describe('collectReferenceIssues', () => {
	test('accepts references that resolve', () => {
		const entries = makeEntries([
			makeEntry({
				id: 'some-place',
				data: { regions: makeRefs('regions', ['taipei']), themes: makeRefs('themes', ['ruins']) },
			}),
		]);

		expect(collectReferenceIssues(entries)).toEqual([]);
	});

	test('flags a reference to a missing entry and reports its field path', () => {
		const entries = makeEntries([
			makeEntry({
				id: 'some-place',
				filePath: 'locations/some-place.mdx',
				data: { regions: makeRefs('regions', ['taipei', 'atlantis']) },
			}),
		]);

		expect(collectReferenceIssues(entries)).toEqual([
			{
				location: 'locations/some-place.mdx',
				field: 'regions[1]',
				collection: 'regions',
				id: 'atlantis',
			},
		]);
	});

	test('flags a reference whose target exists in a different collection', () => {
		const entries = makeEntries([
			makeEntry({ id: 'some-place', data: { regions: makeRefs('regions', ['ruins']) } }),
		]);

		expect(collectReferenceIssues(entries)).toEqual([
			{ location: 'some-place', field: 'regions[0]', collection: 'regions', id: 'ruins' },
		]);
	});

	test('walks nested objects', () => {
		const entries = makeEntries([
			makeEntry({
				id: 'some-place',
				data: { override: { regions: makeRefs('regions', ['atlantis']) } },
			}),
		]);

		expect(collectReferenceIssues(entries)).toEqual([
			{
				location: 'some-place',
				field: 'override.regions[0]',
				collection: 'regions',
				id: 'atlantis',
			},
		]);
	});

	test('ignores references into collections outside the checked set', () => {
		const entries = makeEntries([
			makeEntry({ id: 'some-place', data: { images: makeRefs('images', ['missing.jpg']) } }),
		]);

		expect(collectReferenceIssues(entries)).toEqual([]);
	});

	test('ignores plain data that is not a reference', () => {
		const entries = makeEntries([
			makeEntry({
				id: 'some-place',
				data: { title: 'Some Place', geometry: [121.5, 25.05], links: [{ url: 'https://x.test' }] },
			}),
		]);

		expect(collectReferenceIssues(entries)).toEqual([]);
	});
});
