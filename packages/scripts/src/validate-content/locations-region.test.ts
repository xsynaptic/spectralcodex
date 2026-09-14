import { describe, expect, test } from 'vitest';

import { collectLocationsRegionsIssues } from '#validate-content/locations-region.ts';
import { makeEntry, makeRegionRefs } from '#validate-content/validate-test-utils.ts';

function makeLocation(id: string, regionIds: Array<string>, filePath?: string) {
	return makeEntry({
		data: { regions: makeRegionRefs(regionIds) },
		id,
		...(filePath ? { filePath } : {}),
	});
}

const taipeiPath = 'packages/content/collections/locations/taiwan/taipei/some-place.mdx';

describe('collectLocationsRegionsIssues', () => {
	test('accepts a first region matching the parent folder', () => {
		const entries = [makeLocation('some-place', ['taipei'], taipeiPath)];

		expect(collectLocationsRegionsIssues(entries)).toEqual([]);
	});

	test('flags a first region that does not match the parent folder', () => {
		const entries = [makeLocation('some-place', ['tainan'], taipeiPath)];

		expect(collectLocationsRegionsIssues(entries)).toEqual([
			{
				expectedRegion: 'taipei',
				filename: 'some-place.mdx',
				foundRegion: 'tainan',
				hierarchy: ['taiwan', 'taipei', 'some-place'],
			},
		]);
	});

	test('skips an entry without a regions field', () => {
		const entries = [makeEntry({ filePath: taipeiPath, id: 'some-place' })];

		expect(collectLocationsRegionsIssues(entries)).toEqual([]);
	});

	test('expects "unknown" when the entry has no file path', () => {
		const entries = [makeLocation('some-place', ['taipei'])];

		expect(collectLocationsRegionsIssues(entries)).toEqual([
			{
				expectedRegion: 'unknown',
				filename: 'some-place',
				foundRegion: 'taipei',
				hierarchy: [],
			},
		]);
	});
});
