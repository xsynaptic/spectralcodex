import { describe, expect, test } from 'vitest';

import type { DateRecordedEntry } from '#lib/utils/date.ts';

import {
	getDateDisplay,
	getDateRanges,
	getDayKey,
	sortByDateReverseChronological,
} from '#lib/utils/date.ts';

const longMonth: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC',
	year: 'numeric',
};

const shortMonth: Intl.DateTimeFormatOptions = { ...longMonth, month: 'short' };

const numericMonth: Intl.DateTimeFormatOptions = { ...longMonth, month: 'numeric' };

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('getDateDisplay single date', () => {
	test('renders a month name with an ordinal day and the year', () => {
		expect(getDateDisplay(utc('2018-05-13'), undefined, longMonth)).toBe('May 13th, 2018');
	});

	test.each([
		[1, 'May 1st, 2018'],
		[2, 'May 2nd, 2018'],
		[3, 'May 3rd, 2018'],
		[4, 'May 4th, 2018'],
		[11, 'May 11th, 2018'],
		[12, 'May 12th, 2018'],
		[13, 'May 13th, 2018'],
		[21, 'May 21st, 2018'],
		[22, 'May 22nd, 2018'],
		[23, 'May 23rd, 2018'],
	])('day %i takes the English ordinal suffix', (day, expected) => {
		const date = utc(`2018-05-${String(day).padStart(2, '0')}`);

		expect(getDateDisplay(date, undefined, longMonth)).toBe(expected);
	});

	test('a short month name takes the ordinal path too', () => {
		expect(getDateDisplay(utc('2018-01-03'), undefined, shortMonth)).toBe('Jan 3rd, 2018');
	});

	test('a numeric month gets no ordinal suffix', () => {
		const display = getDateDisplay(utc('2018-05-13'), undefined, numericMonth);

		expect(display).toBe('5/13/2018');
		expect(display).not.toMatch(/\d(?:st|nd|rd|th)/);
	});
});

describe('getDateDisplay range', () => {
	test('shows the year once when both ends share it', () => {
		const display = getDateDisplay(utc('2018-05-13'), utc('2018-05-15'), longMonth);

		expect(display).toBe('May 13th to May 15th, 2018');
	});

	test('shows both years when the range crosses a year boundary', () => {
		const display = getDateDisplay(utc('2018-12-30'), utc('2019-01-02'), longMonth);

		expect(display).toBe('December 30th, 2018 to January 2nd, 2019');
	});

	test('keeps both years when the ends share a month but not a year', () => {
		const display = getDateDisplay(utc('2018-05-13'), utc('2019-05-15'), longMonth);

		expect(display).toBe('May 13th, 2018 to May 15th, 2019');
	});

	test('renders a range under a format that carries no year', () => {
		const yearless: Intl.DateTimeFormatOptions = { ...longMonth, year: undefined };

		expect(getDateDisplay(utc('2018-05-13'), utc('2018-05-15'), yearless)).toBe(
			'May 13th to May 15th',
		);
	});

	test('repeats the month name on both ends within one month', () => {
		const display = getDateDisplay(utc('2018-05-13'), utc('2018-05-15'), shortMonth);

		expect(display).toBe('May 13th to May 15th, 2018');
	});

	test('a numeric month range keeps both dates and gains no ordinal suffix', () => {
		const display = getDateDisplay(utc('2018-05-13'), utc('2018-05-15'), numericMonth);

		expect(display).toContain('5/13/2018');
		expect(display).toContain('5/15/2018');
		expect(display).not.toMatch(/\d(?:st|nd|rd|th)/);
	});
});

describe('getDateRanges', () => {
	const single = { date: utc('2018-05-13'), hasTime: false };
	const tupleStart = { date: utc('2019-03-01'), hasTime: false };
	const tupleEnd = { date: utc('2019-03-08'), hasTime: true };

	test('a tuple becomes a start and an end', () => {
		expect(getDateRanges([[tupleStart, tupleEnd]])).toStrictEqual([
			{ end: tupleEnd, start: tupleStart },
		]);
	});

	test('a lone entry becomes a start with no end', () => {
		const [range] = getDateRanges([single]);

		expect(range).toStrictEqual({ start: single });
		expect(range?.end).toBeUndefined();
	});

	test('output is sorted by start date regardless of input order', () => {
		const entries: Array<DateRecordedEntry> = [[tupleStart, tupleEnd], single];

		expect(getDateRanges(entries).map((range) => range.start)).toStrictEqual([single, tupleStart]);
		expect(getDateRanges(entries.toReversed()).map((range) => range.start)).toStrictEqual([
			single,
			tupleStart,
		]);
	});
});

describe('getDayKey', () => {
	test('zero-pads the month and the day', () => {
		expect(getDayKey(utc('2018-01-05'))).toBe('2018-01-05');
	});

	test('keeps a two-digit month and day as written', () => {
		expect(getDayKey(utc('2018-12-25'))).toBe('2018-12-25');
	});

	test('buckets by the UTC day, not the local one', () => {
		expect(getDayKey(new Date('2018-05-13T23:30:00Z'))).toBe('2018-05-13');
		expect(getDayKey(new Date('2018-05-13T00:30:00Z'))).toBe('2018-05-13');
	});
});

const entry = (dateCreated: string, dateUpdated?: string) => ({
	data: {
		dateCreated: utc(dateCreated),
		...(dateUpdated === undefined ? {} : { dateUpdated: utc(dateUpdated) }),
	},
});

describe('sortByDateReverseChronological', () => {
	test('sorts newest first by dateCreated', () => {
		const older = entry('2018-01-01');
		const newer = entry('2020-01-01');

		expect([older, newer].sort(sortByDateReverseChronological)).toStrictEqual([newer, older]);
	});

	test('dateUpdated wins over dateCreated when present', () => {
		const revived = entry('2010-01-01', '2024-01-01');
		const recent = entry('2020-01-01');

		expect([recent, revived].sort(sortByDateReverseChronological)).toStrictEqual([revived, recent]);
	});
});
