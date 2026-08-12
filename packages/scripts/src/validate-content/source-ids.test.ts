import { describe, expect, test, vi } from 'vitest';

import { checkSourceIds, collectSourceIdIssues } from './source-ids';
import { makeEntry, noop } from './validate-test-utils';

const resourceEntries = [makeEntry({ id: 'existing-resource' })];

describe('collectSourceIdIssues', () => {
	test('accepts a source id that names a known resource', () => {
		const entries = [makeEntry({ id: 'a-location', data: { sources: ['existing-resource'] } })];

		expect(collectSourceIdIssues(entries, resourceEntries)).toEqual([]);
	});

	test('flags a dangling source id with its location', () => {
		const entries = [
			makeEntry({
				id: 'a-location',
				filePath: 'locations/a-location.mdx',
				data: { sources: ['missing-resource'] },
			}),
		];

		expect(collectSourceIdIssues(entries, resourceEntries)).toEqual([
			{ location: 'locations/a-location.mdx', id: 'missing-resource' },
		]);
	});

	test('skips inline sources, which have no resource entry to name', () => {
		const entries = [
			makeEntry({
				id: 'a-location',
				data: { sources: [{ title: 'An uncatalogued report', resourceType: 'report' }] },
			}),
		];

		expect(collectSourceIdIssues(entries, resourceEntries)).toEqual([]);
	});

	test('collects every broken id across a mixed sources array', () => {
		const entries = [
			makeEntry({
				id: 'a-location',
				data: {
					sources: ['missing-one', { title: 'Inline' }, 'existing-resource', 'missing-two'],
				},
			}),
		];

		expect(collectSourceIdIssues(entries, resourceEntries).map((issue) => issue.id)).toEqual([
			'missing-one',
			'missing-two',
		]);
	});

	test('skips entries without sources', () => {
		const entries = [makeEntry({ id: 'a-location' })];

		expect(collectSourceIdIssues(entries, resourceEntries)).toEqual([]);
	});
});

describe('checkSourceIds', () => {
	test('returns true when all source ids resolve and false otherwise', () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(noop);
		const valid = [makeEntry({ id: 'a-location', data: { sources: ['existing-resource'] } })];
		const broken = [makeEntry({ id: 'a-location', data: { sources: ['missing-resource'] } })];

		expect(checkSourceIds(valid, resourceEntries)).toBe(true);
		expect(checkSourceIds(broken, resourceEntries)).toBe(false);

		logSpy.mockRestore();
	});
});
