import { describe, expect, test } from 'vitest';

import type { BuildRecord } from '#lib/build-stats/build-stats-loader.ts';

import { millisecondsPerDay } from '#constants.ts';
import {
	buildStatsLayout,
	durationFrame,
	getBuildStatsGeometry,
} from '#lib/build-stats/build-stats-geometry.ts';

const dayZero = Date.UTC(2026, 0, 1);

function buildRecord(dayOffset: number, durationSeconds: number, rest: Partial<BuildRecord> = {}) {
	return {
		timestamp: new Date(dayZero + dayOffset * millisecondsPerDay).toISOString(),
		durationSeconds,
		...rest,
	} satisfies BuildRecord;
}

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
