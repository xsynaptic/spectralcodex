import { describe, expect, test } from 'vitest';

import { collectSourceIdIssues } from '#validate-content/source-ids.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const resourceEntries = [makeEntry({ id: 'existing-resource' })];

describe('collectSourceIdIssues', () => {
	test('accepts a source id that names a known resource', () => {
		const entries = [makeEntry({ data: { sources: ['existing-resource'] }, id: 'a-location' })];

		expect(collectSourceIdIssues(entries, resourceEntries)).toEqual([]);
	});

	test('flags a dangling source id with its location', () => {
		const entries = [
			makeEntry({
				data: { sources: ['missing-resource'] },
				filePath: 'locations/a-location.mdx',
				id: 'a-location',
			}),
		];

		expect(collectSourceIdIssues(entries, resourceEntries)).toEqual([
			{ id: 'missing-resource', location: 'locations/a-location.mdx' },
		]);
	});

	test('skips inline sources, which have no resource entry to name', () => {
		const entries = [
			makeEntry({
				data: { sources: [{ resourceType: 'report', title: 'An uncatalogued report' }] },
				id: 'a-location',
			}),
		];

		expect(collectSourceIdIssues(entries, resourceEntries)).toEqual([]);
	});

	test('collects every broken id across a mixed sources array', () => {
		const entries = [
			makeEntry({
				data: {
					sources: ['missing-one', { title: 'Inline' }, 'existing-resource', 'missing-two'],
				},
				id: 'a-location',
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
