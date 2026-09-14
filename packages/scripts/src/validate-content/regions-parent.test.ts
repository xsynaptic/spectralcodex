import { describe, expect, test } from 'vitest';

import { collectRegionsParentsIssues } from '#validate-content/regions-parent.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

describe('collectRegionsParentsIssues', () => {
	test('accepts valid parents and entries without a parent', () => {
		const entries = [
			makeEntry({ id: 'taiwan' }),
			makeEntry({ data: { parent: 'taiwan' }, id: 'taipei' }),
		];

		expect(collectRegionsParentsIssues(entries)).toEqual([]);
	});

	test('flags a parent that references a missing region', () => {
		const entries = [makeEntry({ data: { parent: 'atlantis' }, id: 'taipei' })];

		expect(collectRegionsParentsIssues(entries)).toEqual([
			{ location: 'taipei', parent: 'atlantis', reason: 'not-found' },
		]);
	});

	test('flags a region that references itself', () => {
		const entries = [makeEntry({ data: { parent: 'taipei' }, id: 'taipei' })];

		expect(collectRegionsParentsIssues(entries)).toEqual([{ location: 'taipei', reason: 'self' }]);
	});

	test('flags a two-node parent cycle once with the chain spelled out', () => {
		const entries = [
			makeEntry({ data: { parent: 'yang' }, id: 'yin' }),
			makeEntry({ data: { parent: 'yin' }, id: 'yang' }),
		];

		expect(collectRegionsParentsIssues(entries)).toEqual([
			{ chain: ['yin', 'yang', 'yin'], location: 'yin', reason: 'cycle' },
		]);
	});

	test('flags a longer cycle once and skips chains that merely lead into it', () => {
		const entries = [
			makeEntry({ data: { parent: 'two' }, id: 'one' }),
			makeEntry({ data: { parent: 'three' }, id: 'two' }),
			makeEntry({ data: { parent: 'one' }, id: 'three' }),
			makeEntry({ data: { parent: 'one' }, id: 'outsider' }),
		];

		expect(collectRegionsParentsIssues(entries)).toEqual([
			{ chain: ['one', 'two', 'three', 'one'], location: 'one', reason: 'cycle' },
		]);
	});

	test('does not report a valid deep chain as a cycle', () => {
		const entries = [
			makeEntry({ id: 'taiwan' }),
			makeEntry({ data: { parent: 'taiwan' }, id: 'taipei' }),
			makeEntry({ data: { parent: 'taipei' }, id: 'datong' }),
		];

		expect(collectRegionsParentsIssues(entries)).toEqual([]);
	});
});
