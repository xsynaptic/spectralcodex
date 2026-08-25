import * as R from 'remeda';

import type { BuildRecord } from '#lib/build-stats/build-stats-loader.ts';

import { millisecondsPerDay } from '#constants.ts';

export interface BuildStatsPoint {
	time: number;
	value: number;
}

export interface BuildStatsAnnotation {
	time: number;
	label: string;
}

// Anchored on the newest record, not on today, so the window holds the same builds on any build date
export function getRecentBuildRecords(
	records: Array<BuildRecord>,
	daysLimit: number,
): Array<BuildRecord> {
	const last = records.at(-1);

	if (!last || daysLimit === Infinity) return records;

	const cutoff = new Date(last.timestamp).getTime() - daysLimit * millisecondsPerDay;

	return records.filter((record) => new Date(record.timestamp).getTime() >= cutoff);
}

export function getUtcDayStart(time: number): number {
	return Math.floor(time / millisecondsPerDay) * millisecondsPerDay;
}

export function getRollingMedian(
	records: Array<BuildRecord>,
	windowDays: number,
): Array<BuildStatsPoint | undefined> {
	const points = records.map((record) => ({
		time: new Date(record.timestamp).getTime(),
		value: record.durationSeconds,
	}));

	const firstTime = points.at(0)?.time;
	const lastTime = points.at(-1)?.time;

	if (firstTime === undefined || lastTime === undefined) return [];

	const halfWindow = (windowDays / 2) * millisecondsPerDay;
	const trend: Array<BuildStatsPoint | undefined> = [];

	for (
		let day = getUtcDayStart(firstTime);
		day <= getUtcDayStart(lastTime);
		day += millisecondsPerDay
	) {
		const median = R.median(
			points
				.filter((point) => Math.abs(point.time - day) <= halfWindow)
				.map((point) => point.value),
		);

		trend.push(median === undefined ? undefined : { time: day, value: median });
	}

	return trend;
}

export function getBuildAnnotations(records: Array<BuildRecord>): Array<BuildStatsAnnotation> {
	return records.flatMap((record) => {
		const label = record.notes?.trim();

		return label ? [{ time: new Date(record.timestamp).getTime(), label }] : [];
	});
}

export function formatBuildDuration(seconds: number): string {
	const rounded = Math.round(seconds);

	if (rounded < 60) return `${String(rounded)}s`;
	if (rounded < 3600) return `${String(Math.floor(rounded / 60))}m ${String(rounded % 60)}s`;

	// Minutes round before the hours are split off; rounding the leftover afterwards yields "1h 60m"
	const minutes = Math.round(rounded / 60);

	return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60)}m`;
}
