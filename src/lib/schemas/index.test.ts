import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DateRecordedSchema, DateSchema, TitleSchema } from '#lib/schemas/index.ts';

describe('DateSchema', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('accepts today and tomorrow', () => {
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

	test('accepts dates well in the past', () => {
		expect(DateSchema.safeParse(new Date('2018-05-13T00:00:00Z')).success).toBe(true);
	});
});

describe('DateRecordedSchema', () => {
	test('a UTC midnight instant carries no time of day', () => {
		expect(DateRecordedSchema.parse([new Date('2020-01-01T00:00:00Z')])).toStrictEqual([
			{ date: new Date('2020-01-01T00:00:00Z'), hasTime: false },
		]);
	});

	test('a time past midnight is a time of day, minutes or hours', () => {
		const [halfPast] = DateRecordedSchema.parse([new Date('2020-01-01T00:30:00Z')]);
		const [morning] = DateRecordedSchema.parse([new Date('2020-01-01T05:00:00Z')]);

		expect(halfPast).toStrictEqual({ date: new Date('2020-01-01T00:30:00Z'), hasTime: true });
		expect(morning).toStrictEqual({ date: new Date('2020-01-01T05:00:00Z'), hasTime: true });
	});

	test('a tuple stays a tuple of two transformed values', () => {
		const start = new Date('2020-01-01T00:00:00Z');
		const end = new Date('2020-01-03T08:15:00Z');

		expect(DateRecordedSchema.parse([[start, end]])).toStrictEqual([
			[
				{ date: start, hasTime: false },
				{ date: end, hasTime: true },
			],
		]);
	});
});

describe('TitleSchema', () => {
	test('refines typography and trims the result', () => {
		expect(TitleSchema.parse('  "Hello" -- world  ')).toBe('“Hello” – world');
	});
});
