import { describe, expect, test } from 'vitest';

import { collectLocationsRegionsIssues } from '#validate-content/locations-region.ts';
import { makeEntry, makeRegionRefs } from '#validate-content/validate-test-utils.ts';

function makeLocation(id: string, regionIds: Array<string>, filePath?: string) {
	return makeEntry({
		id,
		data: { regions: makeRegionRefs(regionIds) },
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
				filename: 'some-place.mdx',
				expectedRegion: 'taipei',
				foundRegion: 'tainan',
				hierarchy: ['taiwan', 'taipei', 'some-place'],
			},
		]);
	});

	test('skips an entry without a regions field', () => {
		const entries = [makeEntry({ id: 'some-place', filePath: taipeiPath })];

		expect(collectLocationsRegionsIssues(entries)).toEqual([]);
	});

	test('expects "unknown" when the entry has no file path', () => {
		const entries = [makeLocation('some-place', ['taipei'])];

		expect(collectLocationsRegionsIssues(entries)).toEqual([
			{
				filename: 'some-place',
				expectedRegion: 'unknown',
				foundRegion: 'taipei',
				hierarchy: [],
			},
		]);
	});
});
