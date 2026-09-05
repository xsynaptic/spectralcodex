import { describe, expect, test } from 'vitest';

import { collectRegionsParentsIssues } from '#validate-content/regions-parent.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

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

		expect(collectRegionsParentsIssues(entries)).toEqual([
			{ location: 'taipei', reason: 'not-found', parent: 'atlantis' },
		]);
	});

	test('flags a region that references itself', () => {
		const entries = [makeEntry({ id: 'taipei', data: { parent: 'taipei' } })];

		expect(collectRegionsParentsIssues(entries)).toEqual([{ location: 'taipei', reason: 'self' }]);
	});

	test('flags a two-node parent cycle once with the chain spelled out', () => {
		const entries = [
			makeEntry({ id: 'yin', data: { parent: 'yang' } }),
			makeEntry({ id: 'yang', data: { parent: 'yin' } }),
		];

		expect(collectRegionsParentsIssues(entries)).toEqual([
			{ location: 'yin', reason: 'cycle', chain: ['yin', 'yang', 'yin'] },
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
			{ location: 'one', reason: 'cycle', chain: ['one', 'two', 'three', 'one'] },
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
});
