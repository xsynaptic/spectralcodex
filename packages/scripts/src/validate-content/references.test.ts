import { describe, expect, test } from 'vitest';

import { collectReferenceIssues } from '#validate-content/references.ts';
import { makeEntry, makeRefs } from '#validate-content/validate-test-utils.ts';

// The checked set is whatever collections the passed entries belong to
function makeEntries(locations: Array<ReturnType<typeof makeEntry>>) {
	return [
		...locations,
		makeEntry({ collection: 'regions', id: 'taipei' }),
		makeEntry({ collection: 'themes', id: 'ruins' }),
	];
}

describe('collectReferenceIssues', () => {
	test('accepts references that resolve', () => {
		const entries = makeEntries([
			makeEntry({
				data: { regions: makeRefs('regions', ['taipei']), themes: makeRefs('themes', ['ruins']) },
				id: 'some-place',
			}),
		]);

		expect(collectReferenceIssues(entries)).toEqual([]);
	});

	test('flags a reference to a missing entry and reports its field path', () => {
		const entries = makeEntries([
			makeEntry({
				data: { regions: makeRefs('regions', ['taipei', 'atlantis']) },
				filePath: 'locations/some-place.mdx',
				id: 'some-place',
			}),
		]);

		expect(collectReferenceIssues(entries)).toEqual([
			{
				collection: 'regions',
				field: 'regions[1]',
				id: 'atlantis',
				location: 'locations/some-place.mdx',
			},
		]);
	});

	test('flags a reference whose target exists in a different collection', () => {
		const entries = makeEntries([
			makeEntry({ data: { regions: makeRefs('regions', ['ruins']) }, id: 'some-place' }),
		]);

		expect(collectReferenceIssues(entries)).toEqual([
			{ collection: 'regions', field: 'regions[0]', id: 'ruins', location: 'some-place' },
		]);
	});

	test('walks nested objects', () => {
		const entries = makeEntries([
			makeEntry({
				data: { override: { regions: makeRefs('regions', ['atlantis']) } },
				id: 'some-place',
			}),
		]);

		expect(collectReferenceIssues(entries)).toEqual([
			{
				collection: 'regions',
				field: 'override.regions[0]',
				id: 'atlantis',
				location: 'some-place',
			},
		]);
	});

	test('flags a reference into a collection outside the checked set', () => {
		const entries = makeEntries([
			makeEntry({ data: { images: makeRefs('images', ['missing.jpg']) }, id: 'some-place' }),
		]);

		expect(collectReferenceIssues(entries)).toEqual([
			{ collection: 'images', field: 'images[0]', id: 'missing.jpg', location: 'some-place' },
		]);
	});

	test('ignores references into a skipped collection', () => {
		const entries = makeEntries([
			makeEntry({ data: { images: makeRefs('images', ['missing.jpg']) }, id: 'some-place' }),
		]);

		expect(collectReferenceIssues(entries, { skipCollections: ['images'] })).toEqual([]);
	});

	test('ignores an object carrying an id but no collection', () => {
		const entries = makeEntries([
			makeEntry({ data: { override: { id: 'anonymous-place' } }, id: 'some-place' }),
		]);

		expect(collectReferenceIssues(entries)).toEqual([]);
	});

	test('ignores plain data that is not a reference', () => {
		const entries = makeEntries([
			makeEntry({
				data: { geometry: [121.5, 25.05], links: [{ url: 'https://x.test' }], title: 'Some Place' },
				id: 'some-place',
			}),
		]);

		expect(collectReferenceIssues(entries)).toEqual([]);
	});
});
