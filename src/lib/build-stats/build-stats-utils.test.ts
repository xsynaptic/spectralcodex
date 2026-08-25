import { describe, expect, test } from 'vitest';

import type { BuildRecord } from '#lib/build-stats/build-stats-loader.ts';

import { millisecondsPerDay } from '#constants.ts';
import {
	formatBuildDuration,
	getBuildAnnotations,
	getRecentBuildRecords,
	getRollingMedian,
} from '#lib/build-stats/build-stats-utils.ts';

const dayZero = Date.UTC(2026, 0, 1);

function buildRecord(dayOffset: number, durationSeconds: number, rest: Partial<BuildRecord> = {}) {
	return {
		timestamp: new Date(dayZero + dayOffset * millisecondsPerDay).toISOString(),
		durationSeconds,
		...rest,
	} satisfies BuildRecord;
}

// The window hangs off the newest record, so it holds the same builds on any later build date
test('getRecentBuildRecords keeps the records inside the window ending at the newest one', () => {
	const records = [buildRecord(0, 900), buildRecord(180, 500), buildRecord(200, 100)];

	expect(getRecentBuildRecords(records, 90).map((record) => record.durationSeconds)).toStrictEqual([
		500, 100,
	]);
	expect(getRecentBuildRecords(records, Infinity)).toStrictEqual(records);
});

describe('getRollingMedian', () => {
	test('a window with enough samples reports their median', () => {
		const trend = getRollingMedian(
			[buildRecord(0, 100), buildRecord(1, 200), buildRecord(2, 300)],
			25,
		);

		expect(trend.map((point) => point?.value)).toStrictEqual([200, 200, 200]);
	});

	test('records outside the window do not reach it, and the sparse stretch breaks the line', () => {
		const trend = getRollingMedian(
			[
				buildRecord(0, 100),
				buildRecord(1, 100),
				buildRecord(2, 100),
				buildRecord(40, 900),
				buildRecord(41, 900),
				buildRecord(42, 900),
			],
			10,
		);

		expect(trend.at(0)?.value).toBe(100);
		expect(trend.at(-1)?.value).toBe(900);
		expect(trend.includes(undefined)).toBe(true);
	});
});

test('getBuildAnnotations takes a note as a label and ignores whitespace', () => {
	const annotations = getBuildAnnotations([
		buildRecord(0, 100, { notes: '  ' }),
		buildRecord(1, 100, { notes: 'Astro 7' }),
		buildRecord(2, 100),
	]);

	expect(annotations).toStrictEqual([{ time: dayZero + millisecondsPerDay, label: 'Astro 7' }]);
});

describe('formatBuildDuration', () => {
	test('formats seconds, minutes, and hours', () => {
		expect(formatBuildDuration(45)).toBe('45s');
		expect(formatBuildDuration(133)).toBe('2m 13s');
		expect(formatBuildDuration(8294)).toBe('2h 18m');
	});

	// Regression: leftover seconds used to round up into a 60th minute rather than a whole hour
	test('a remainder just short of the hour carries into the hour', () => {
		expect(formatBuildDuration(7170)).toBe('2h 0m');
		expect(formatBuildDuration(3599.6)).toBe('1h 0m');

		for (let seconds = 3600; seconds < 20_000; seconds += 1) {
			expect(formatBuildDuration(seconds)).not.toContain(' 60m');
		}
	});
});
