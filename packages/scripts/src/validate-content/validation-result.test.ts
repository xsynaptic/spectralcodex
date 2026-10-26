import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { reportValidationResult } from '#validate-content/validation-result.ts';

describe('reportValidationResult', () => {
	// Chalk strips its own styling under vitest, so the lines compare as plain text
	const lines: Array<string> = [];

	beforeEach(() => {
		lines.length = 0;
		vi.spyOn(console, 'error').mockImplementation((line: string) => {
			lines.push(line);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('prints the pass summary, then any notes', () => {
		reportValidationResult({
			issues: [],
			notes: ['   2  3:2'],
			status: 'pass',
			summary: '2 image aspect ratios valid',
		});

		expect(lines).toEqual(['✓ 2 image aspect ratios valid', '     2  3:2']);
	});

	test('prints issues above the summary, with details indented', () => {
		reportValidationResult({
			issues: [{ details: ['Line 3: broken link ID "missing"'], message: 'a-post.mdx' }],
			status: 'fail',
			summary: 'Found 1 broken link ID(s)',
		});

		expect(lines).toEqual([
			'✗ a-post.mdx',
			'  Line 3: broken link ID "missing"',
			'✗ Found 1 broken link ID(s)',
		]);
	});

	test('marks advisory issues as warnings', () => {
		reportValidationResult({
			issues: [{ message: 'a: overlaps b (3.0m)' }],
			status: 'warn',
			summary: 'Found 1 overlap(s)',
		});

		expect(lines).toEqual(['⚠ a: overlaps b (3.0m)', '⚠ Found 1 overlap(s)']);
	});
});
