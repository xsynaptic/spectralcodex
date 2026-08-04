import { describe, expect, test, vi } from 'vitest';

import { checkContentDates, collectContentDatesIssues } from './content-dates';
import { makeEntry, noop } from './validate-test-utils';

// 18:06 UTC on the 3rd is 02:06 on the 4th in UTC+8, the window where "today" outruns UTC
const now = new Date('2026-08-03T18:06:00Z');

describe('collectContentDatesIssues', () => {
	test("accepts today's date authored from a timezone ahead of UTC", () => {
		const entries = [
			makeEntry({ id: 'a', data: { dateCreated: new Date('2026-08-04T00:00:00Z') } }),
		];

		expect(collectContentDatesIssues(entries, now)).toEqual([]);
	});

	test('accepts past dates and entries without dates', () => {
		const entries = [
			makeEntry({ id: 'a', data: { dateCreated: new Date('2025-01-01T00:00:00Z') } }),
			makeEntry({ id: 'b' }),
		];

		expect(collectContentDatesIssues(entries, now)).toEqual([]);
	});

	test('flags a date beyond the one day of slack', () => {
		const entries = [
			makeEntry({ id: 'a', data: { dateCreated: new Date('2026-08-05T00:00:00Z') } }),
		];

		expect(collectContentDatesIssues(entries, now)).toEqual([
			'a (dateCreated 2026-08-05 is in the future)',
		]);
	});

	test('flags dateUpdated and reports the file path', () => {
		const entries = [
			makeEntry({
				id: 'a',
				data: {
					dateCreated: new Date('2025-01-01T00:00:00Z'),
					dateUpdated: new Date('2027-08-04T00:00:00Z'),
				},
				filePath: 'posts/a.mdx',
			}),
		];

		expect(collectContentDatesIssues(entries, now)).toEqual([
			'posts/a.mdx (dateUpdated 2027-08-04 is in the future)',
		]);
	});

	test('rolls the cutoff over a month boundary', () => {
		const entries = [
			makeEntry({ id: 'a', data: { dateCreated: new Date('2026-09-01T00:00:00Z') } }),
			makeEntry({ id: 'b', data: { dateCreated: new Date('2026-09-02T00:00:00Z') } }),
		];

		expect(collectContentDatesIssues(entries, new Date('2026-08-31T18:06:00Z'))).toEqual([
			'b (dateCreated 2026-09-02 is in the future)',
		]);
	});
});

describe('checkContentDates', () => {
	test('returns true when all dates are valid and false otherwise', () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(noop);

		expect(checkContentDates([makeEntry({ id: 'a' })])).toBe(true);
		expect(
			checkContentDates([makeEntry({ id: 'a', data: { dateCreated: new Date('2099-01-01') } })]),
		).toBe(false);

		logSpy.mockRestore();
	});
});
