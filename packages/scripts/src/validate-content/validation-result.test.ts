import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { reportValidationResult, toValidationResult } from './validation-result.ts';

describe('toValidationResult', () => {
	test('passes with the pass summary when nothing is flagged', () => {
		expect(toValidationResult([], { pass: 'all good', fail: 'Found 0 problem(s)' })).toEqual({
			status: 'pass',
			summary: 'all good',
			issues: [],
		});
	});

	test('fails with the fail summary and keeps the issues', () => {
		const issues = [{ message: 'a-post: broken' }];

		expect(toValidationResult(issues, { pass: 'all good', fail: 'Found 1 problem(s)' })).toEqual({
			status: 'fail',
			summary: 'Found 1 problem(s)',
			issues,
		});
	});
});

describe('reportValidationResult', () => {
	// Chalk strips its own styling under vitest, so the lines compare as plain text
	const lines: Array<string> = [];

	beforeEach(() => {
		lines.length = 0;
		vi.spyOn(console, 'log').mockImplementation((line: string) => {
			lines.push(line);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('prints the pass summary, then any notes', () => {
		reportValidationResult({
			status: 'pass',
			summary: '2 image aspect ratios valid',
			issues: [],
			notes: ['   2  3:2'],
		});

		expect(lines).toEqual(['✓ 2 image aspect ratios valid', '   2  3:2']);
	});

	test('prints issues above the summary, with details indented', () => {
		reportValidationResult({
			status: 'fail',
			summary: 'Found 1 broken link ID(s)',
			issues: [{ message: 'a-post.mdx', details: ['Line 3: broken link ID "missing"'] }],
		});

		expect(lines).toEqual([
			'❌ a-post.mdx',
			'   Line 3: broken link ID "missing"',
			'⚠️  Found 1 broken link ID(s)',
		]);
	});

	test('marks advisory issues as warnings', () => {
		reportValidationResult({
			status: 'warn',
			summary: 'Found 1 overlap(s)',
			issues: [{ message: 'a: overlaps b (3.0m)' }],
		});

		expect(lines).toEqual(['⚠️  a: overlaps b (3.0m)', '⚠️  Found 1 overlap(s)']);
	});
});
