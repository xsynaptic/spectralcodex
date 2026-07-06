import { describe, expect, test, vi } from 'vitest';

import { checkLocationsRegions, collectLocationsRegionsIssues } from './locations-region';
import { makeEntry, makeRegionRefs, noop } from './validate-test-utils';

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
				type: 'mismatch',
				filename: 'some-place.mdx',
				expectedRegion: 'taipei',
				foundRegion: 'tainan',
				hierarchy: ['taiwan', 'taipei', 'some-place'],
			},
		]);
	});

	test('flags an entry without a regions field', () => {
		const entries = [makeEntry({ id: 'some-place', filePath: taipeiPath })];

		expect(collectLocationsRegionsIssues(entries)).toEqual([
			{ type: 'missing-regions', filename: 'some-place.mdx' },
		]);
	});

	test('expects "unknown" when the entry has no file path', () => {
		const entries = [makeLocation('some-place', ['taipei'])];

		expect(collectLocationsRegionsIssues(entries)).toEqual([
			{
				type: 'mismatch',
				filename: 'some-place',
				expectedRegion: 'unknown',
				foundRegion: 'taipei',
				hierarchy: [],
			},
		]);
	});
});

describe('checkLocationsRegions', () => {
	test('fails on mismatches but passes when only regions fields are missing', () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(noop);

		expect(checkLocationsRegions([makeLocation('some-place', ['tainan'], taipeiPath)])).toBe(false);
		// Pinned quirk: missing regions are reported but do not fail the check
		expect(checkLocationsRegions([makeEntry({ id: 'some-place', filePath: taipeiPath })])).toBe(
			true,
		);

		logSpy.mockRestore();
	});
});
