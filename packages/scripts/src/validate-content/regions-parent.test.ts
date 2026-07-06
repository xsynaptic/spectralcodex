import { describe, expect, test, vi } from 'vitest';

import { checkRegionsParents, collectRegionsParentsIssues } from './regions-parent';
import { makeEntry, noop } from './validate-test-utils';

describe('collectRegionsParentsIssues', () => {
	test('accepts valid parents and entries without a parent', () => {
		const entries = [
			makeEntry({ id: 'taiwan' }),
			makeEntry({ id: 'taipei', data: { parent: 'taiwan' } }),
		];

		expect(collectRegionsParentsIssues(entries)).toEqual([]);
	});

	test('flags a parent that references a missing region', () => {
		const entries = [makeEntry({ id: 'taipei', data: { parent: 'atlantis' } })];

		expect(collectRegionsParentsIssues(entries)).toEqual(['taipei (parent "atlantis" not found)']);
	});

	test('flags a region that references itself', () => {
		const entries = [makeEntry({ id: 'taipei', data: { parent: 'taipei' } })];

		expect(collectRegionsParentsIssues(entries)).toEqual(['taipei (parent references itself)']);
	});

	test('flags a two-node parent cycle once with the chain spelled out', () => {
		const entries = [
			makeEntry({ id: 'yin', data: { parent: 'yang' } }),
			makeEntry({ id: 'yang', data: { parent: 'yin' } }),
		];

		expect(collectRegionsParentsIssues(entries)).toEqual([
			'yin (parent chain forms a cycle: yin -> yang -> yin)',
		]);
	});

	test('flags a longer cycle once and skips chains that merely lead into it', () => {
		const entries = [
			makeEntry({ id: 'one', data: { parent: 'two' } }),
			makeEntry({ id: 'two', data: { parent: 'three' } }),
			makeEntry({ id: 'three', data: { parent: 'one' } }),
			makeEntry({ id: 'outsider', data: { parent: 'one' } }),
		];

		expect(collectRegionsParentsIssues(entries)).toEqual([
			'one (parent chain forms a cycle: one -> two -> three -> one)',
		]);
	});

	test('does not report a valid deep chain as a cycle', () => {
		const entries = [
			makeEntry({ id: 'taiwan' }),
			makeEntry({ id: 'taipei', data: { parent: 'taiwan' } }),
			makeEntry({ id: 'datong', data: { parent: 'taipei' } }),
		];

		expect(collectRegionsParentsIssues(entries)).toEqual([]);
	});

	test('reports the file path when available', () => {
		const entries = [
			makeEntry({ id: 'taipei', data: { parent: 'atlantis' }, filePath: 'regions/taipei.mdx' }),
		];

		expect(collectRegionsParentsIssues(entries)[0]).toContain('regions/taipei.mdx');
	});
});

describe('checkRegionsParents', () => {
	test('returns true when all parents are valid and false otherwise', () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(noop);

		expect(checkRegionsParents([makeEntry({ id: 'taiwan' })])).toBe(true);
		expect(checkRegionsParents([makeEntry({ id: 'taipei', data: { parent: 'missing' } })])).toBe(
			false,
		);

		logSpy.mockRestore();
	});
});
