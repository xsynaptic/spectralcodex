import { describe, expect, test } from 'vitest';

import type { BuildRecord } from '#lib/build-stats/build-stats-loader.ts';

import {
	buildStatsLayout,
	durationFrame,
	getBuildStatsGeometry,
} from '#lib/build-stats/build-stats-geometry.ts';
import { buildRecord } from '#lib/build-stats/build-stats-test-utils.ts';

function buildGeometry(records: Array<BuildRecord>) {
	return getBuildStatsGeometry(records, { daysLimit: Infinity, trendWindowDays: 14 });
}

describe('getBuildStatsGeometry', () => {
	test('returns undefined for no records', () => {
		expect(buildGeometry([])).toBeUndefined();
	});

	// Regression: a placeholder endpoint value landed far outside the viewBox, labelled `0s`
	test('the trend endpoint stays inside the duration chart with only two builds', () => {
		const end = buildGeometry([buildRecord(0, 900), buildRecord(1, 100)])?.duration.end;

		expect(end?.cy).toBeGreaterThanOrEqual(durationFrame.top);
		expect(end?.cy).toBeLessThanOrEqual(durationFrame.bottom);
		expect(end?.label).not.toBe('0s');
	});

	test('a chart nothing recorded is absent rather than empty', () => {
		expect(buildGeometry([buildRecord(0, 100), buildRecord(1, 100)])?.pages).toBeUndefined();
	});

	test('each chart reads out only its own series', () => {
		const geometry = buildGeometry([buildRecord(0, 100, { pageCount: 10 }), buildRecord(1, 200)]);

		expect(geometry?.duration.points).toHaveLength(2);
		expect(geometry?.duration.points.at(0)?.values.slice(1)).toStrictEqual(['1m 40s', '2m 30s']);
		expect(geometry?.pages?.points.map((point) => point.values.at(1))).toStrictEqual(['10']);
	});

	test('the series ends flush against the right edge of the plot', () => {
		const geometry = buildGeometry([
			buildRecord(0, 100, { pageCount: 10 }),
			buildRecord(120, 100, { pageCount: 20 }),
		]);

		expect(geometry?.pages?.end.cx).toBe(buildStatsLayout.width - buildStatsLayout.marginRight);
	});

	test('a gap wider than the trend window lifts the pen', () => {
		// 14-day window, so days 8 to 22 have no build within half a window either side
		const gapped = buildGeometry([buildRecord(0, 100), buildRecord(30, 100)])?.duration.trendPath;
		const continuous = buildGeometry([buildRecord(0, 100), buildRecord(3, 100)])?.duration
			.trendPath;

		expect(gapped?.match(/M/g)).toHaveLength(2);
		expect(continuous?.match(/M/g)).toHaveLength(1);

		// One vertex per UTC day, days 0 to 3 inclusive, opened by a move and joined by lines
		expect(continuous?.startsWith('M')).toBe(true);
		expect(continuous?.match(/L/g)).toHaveLength(3);
	});

	test('the year is labelled on the opening tick and each January, nowhere else', () => {
		// March 2026 to February 2027, so the opening tick is not itself a January
		const ticks = buildGeometry([buildRecord(63, 100), buildRecord(397, 100)])?.axisTicks ?? [];

		expect(
			ticks
				.filter((tick) => tick.yearLabel !== undefined)
				.map((tick) => `${tick.label} ${String(tick.yearLabel)}`),
		).toStrictEqual(['Apr 2026', 'Jan 2027']);
		expect(ticks.length).toBeGreaterThan(2);
	});

	test('an annotation is dropped once every tier is taken', () => {
		// Four notes within four days of a 400-day span sit far closer than the label gap
		const marks =
			buildGeometry([
				buildRecord(0, 100, { notes: 'First' }),
				buildRecord(1, 100, { notes: 'Second' }),
				buildRecord(2, 100, { notes: 'Third' }),
				buildRecord(3, 100, { notes: 'Fourth' }),
				buildRecord(400, 100),
			])?.duration.annotations ?? [];

		expect(marks.map((mark) => mark.label)).toStrictEqual(['First', 'Second', 'Third']);
		expect(marks[0]!.labelY).toBeLessThan(marks[1]!.labelY);
		expect(marks[1]!.labelY).toBeLessThan(marks[2]!.labelY);
	});

	test('duration ticks are only those inside the padded domain', () => {
		const narrow = buildGeometry([buildRecord(0, 100), buildRecord(1, 200)])?.duration.ticks ?? [];
		const wide = buildGeometry([buildRecord(0, 60), buildRecord(1, 3600)])?.duration.ticks ?? [];

		// 100/1.08 to 200*1.08 admits 2m alone; 60/1.08 to 3600*1.08 admits everything between
		expect(narrow.map((tick) => tick.label)).toStrictEqual(['2m']);
		expect(wide.map((tick) => tick.label)).toStrictEqual(['1m', '2m', '5m', '15m', '30m', '1h']);

		for (const tick of [...narrow, ...wide]) {
			expect(tick.y).toBeGreaterThanOrEqual(durationFrame.top);
			expect(tick.y).toBeLessThanOrEqual(durationFrame.bottom);
		}
	});

	// Regression: labels used to hang to the right, running the closing one off the plot
	test('annotation labels stay inside the plot at either edge', () => {
		const marks =
			buildGeometry([
				buildRecord(0, 100, { notes: 'First' }),
				buildRecord(120, 100, { notes: 'Last' }),
			])?.duration.annotations ?? [];

		expect(marks).toHaveLength(2);

		for (const mark of marks) {
			expect(mark.labelX).toBeLessThanOrEqual(
				buildStatsLayout.width - buildStatsLayout.marginRight,
			);
			expect(mark.labelX).toBeGreaterThanOrEqual(buildStatsLayout.marginLeft);
		}
	});
});
