import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DateRecordedSchema, DateSchema } from '#lib/schemas/index.ts';

describe('DateSchema', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('accepts the past, today, and tomorrow', () => {
		expect(DateSchema.safeParse(new Date('2018-05-13T00:00:00Z')).success).toBe(true);
		expect(DateSchema.safeParse(new Date('2026-09-20T00:00:00Z')).success).toBe(true);
		expect(DateSchema.safeParse(new Date('2026-09-21T23:59:59Z')).success).toBe(true);
	});

	test('rejects anything two or more days ahead', () => {
		expect(DateSchema.safeParse(new Date('2026-09-22T00:00:00Z')).success).toBe(false);
		expect(DateSchema.safeParse(new Date('2026-10-01T00:00:00Z')).success).toBe(false);
	});

	test('the slack is measured from the UTC day, not the current instant', () => {
		vi.setSystemTime(new Date('2026-09-20T23:30:00Z'));

		expect(DateSchema.safeParse(new Date('2026-09-21T23:59:59Z')).success).toBe(true);
		expect(DateSchema.safeParse(new Date('2026-09-22T00:00:00Z')).success).toBe(false);
	});
});

describe('DateRecordedSchema', () => {
	test.each([
		['2020-01-01T00:00:00Z', false],
		['2020-01-01T00:30:00Z', true],
		['2020-01-01T05:00:00Z', true],
	])('%s has a time of day: %s', (instant, hasTime) => {
		const date = new Date(instant);

		expect(DateRecordedSchema.parse([date])).toStrictEqual([{ date, hasTime }]);
	});
});
