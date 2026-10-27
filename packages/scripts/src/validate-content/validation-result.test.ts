import { captureOutput } from '@xsynaptic/astro-scripts';
import { describe, expect, test } from 'vitest';

import { reportValidationResult } from '#validate-content/validation-result.ts';

describe('reportValidationResult', () => {
	test('prints the pass summary, then any notes', async () => {
		const { events } = await captureOutput(() => {
			reportValidationResult({
				issues: [],
				notes: ['   2  3:2'],
				status: 'pass',
				summary: '2 image aspect ratios valid',
			});
		});

		expect(events).toEqual([
			{ level: 'success', text: '2 image aspect ratios valid', type: 'message' },
			{ level: 'detail', text: '   2  3:2', type: 'message' },
		]);
	});

	test('prints issues above the summary, with details indented', async () => {
		const { events } = await captureOutput(() => {
			reportValidationResult({
				issues: [{ details: ['Line 3: broken link ID "missing"'], message: 'a-post.mdx' }],
				status: 'fail',
				summary: 'Found 1 broken link ID(s)',
			});
		});

		expect(events).toEqual([
			{ level: 'error', text: 'a-post.mdx', type: 'message' },
			{ level: 'detail', text: 'Line 3: broken link ID "missing"', type: 'message' },
			{ level: 'error', text: 'Found 1 broken link ID(s)', type: 'message' },
		]);
	});

	test('marks advisory issues as warnings', async () => {
		const { events } = await captureOutput(() => {
			reportValidationResult({
				issues: [{ message: 'a: overlaps b (3.0m)' }],
				status: 'warn',
				summary: 'Found 1 overlap(s)',
			});
		});

		expect(events).toEqual([
			{ level: 'warn', text: 'a: overlaps b (3.0m)', type: 'message' },
			{ level: 'warn', text: 'Found 1 overlap(s)', type: 'message' },
		]);
	});
});
