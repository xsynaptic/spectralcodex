import { scaleLinear, scaleLog } from 'd3-scale';
import { utcMonth } from 'd3-time';
import * as R from 'remeda';

import type { BuildRecord } from '#lib/build-stats/build-stats-loader.ts';
import type { BuildStatsAnnotation, BuildStatsPoint } from '#lib/build-stats/build-stats-utils.ts';

import { millisecondsPerDay } from '#constants.ts';
import {
	formatBuildDuration,
	getBuildAnnotations,
	getRecentBuildRecords,
	getRollingMedian,
	getUtcDayStart,
} from '#lib/build-stats/build-stats-utils.ts';
import { getDateDisplay } from '#lib/utils/date.ts';
import { formatNumber } from '#lib/utils/text.ts';

export const buildStatsLayout = {
	width: 900,
	marginLeft: 48,
	marginRight: 62,
	headingY: 13,
	top: 26,
	durationHeight: 250,
	pagesHeight: 130,
	axisHeight: 40,
	monthLabelOffset: 18,
	yearLabelOffset: 32,
} as const;

const plotRight = buildStatsLayout.width - buildStatsLayout.marginRight;

// Durations a reader already thinks in; log ticks are powers of ten, which mean nothing for time
const durationTicks = [
	{ seconds: 30, label: '30s' },
	{ seconds: 60, label: '1m' },
	{ seconds: 120, label: '2m' },
	{ seconds: 300, label: '5m' },
	{ seconds: 900, label: '15m' },
	{ seconds: 1800, label: '30m' },
	{ seconds: 3600, label: '1h' },
	{ seconds: 7200, label: '2h' },
	{ seconds: 14_400, label: '4h' },
];

// Roughly the width of a label, so it doubles as the gap at which two of them would overlap
const annotationTierGap = 110;
const annotationTierCount = 3;
const annotationLabelGap = 6;

// Lead-in so the opening mark clears the axis; the series ends flush against the right edge
const axisPaddingDays = 3;

const pagesTickCount = 4;

const tooltipDateOptions = {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC',
} as const satisfies Intl.DateTimeFormatOptions;

export interface ChartFrame {
	top: number;
	bottom: number;
	height: number;
}

function getChartFrame(plotHeight: number): ChartFrame {
	const bottom = buildStatsLayout.top + plotHeight;

	return { top: buildStatsLayout.top, bottom, height: bottom + buildStatsLayout.axisHeight };
}

export const durationFrame = getChartFrame(buildStatsLayout.durationHeight);
export const pagesFrame = getChartFrame(buildStatsLayout.pagesHeight);

export interface AxisTick {
	x: number;
	label: string;
	yearLabel: string | undefined;
}

export interface ValueTick {
	y: number;
	label: string;
}

// Wire format read back by the chart element: date first, then one entry per tooltip row
export interface TooltipPoint {
	x: number;
	y: number;
	values: Array<string>;
}

interface SeriesEndpoint {
	cx: number;
	cy: number;
	label: string;
}

interface AnnotationMark {
	x: number;
	labelX: number;
	labelY: number;
	label: string;
}

export interface DurationGeometry {
	ticks: Array<ValueTick>;
	points: Array<TooltipPoint>;
	trendPath: string;
	end: SeriesEndpoint | undefined;
	annotations: Array<AnnotationMark>;
}

export interface PagesGeometry {
	ticks: Array<ValueTick>;
	points: Array<TooltipPoint>;
	linePath: string;
	areaPath: string;
	end: SeriesEndpoint;
}

export interface BuildStatsGeometry {
	axisTicks: Array<AxisTick>;
	duration: DurationGeometry;
	pages: PagesGeometry | undefined;
}

// Sub-pixel precision is invisible on screen and costs tens of kilobytes of markup
function round(value: number): number {
	return Math.round(value * 10) / 10;
}

// `undefined` lifts the pen, so a gap in the series breaks the line rather than bridging it
function getPolylinePath(points: Array<{ x: number; y: number } | undefined>): string {
	let path = '';
	let penDown = false;

	for (const point of points) {
		if (!point) {
			penDown = false;
			continue;
		}

		path += `${penDown ? 'L' : 'M'}${String(round(point.x))},${String(round(point.y))}`;
		penDown = true;
	}

	return path;
}

function formatPageCount(value: number): string {
	return formatNumber({ number: value });
}

function getPagesGeometry(
	points: Array<BuildStatsPoint>,
	getX: (time: number) => number,
): PagesGeometry | undefined {
	const first = points.at(0);
	const last = points.at(-1);

	if (!first || !last) return undefined;

	const values = points.map((point) => point.value);
	const scale = scaleLinear()
		.domain([Math.min(...values), Math.max(...values)])
		.range([pagesFrame.bottom, pagesFrame.top])
		.nice(pagesTickCount);

	const firstX = getX(first.time);
	const lastX = getX(last.time);

	const linePath = getPolylinePath(
		points.map((point) => ({ x: getX(point.time), y: scale(point.value) })),
	);

	return {
		ticks: scale.ticks(pagesTickCount).map((value) => ({
			y: round(scale(value)),
			label: formatPageCount(value),
		})),
		points: points.map((point) => ({
			x: round(getX(point.time)),
			y: round(scale(point.value)),
			values: [
				getDateDisplay(new Date(point.time), undefined, tooltipDateOptions),
				formatPageCount(point.value),
			],
		})),
		linePath,
		// The baseline is flat, so the fill closes in two commands rather than retracing the series
		areaPath: `${linePath}L${String(round(lastX))},${String(pagesFrame.bottom)}L${String(round(firstX))},${String(pagesFrame.bottom)}Z`,
		end: { cx: round(lastX), cy: round(scale(last.value)), label: formatPageCount(last.value) },
	};
}

function getAnnotationMarks(
	annotations: Array<BuildStatsAnnotation>,
	getX: (time: number) => number,
): Array<AnnotationMark> {
	const tierLastX = Array.from({ length: annotationTierCount }, () => -Infinity);
	const marks: Array<AnnotationMark> = [];
	const ordered = R.sortBy(annotations, (annotation) => annotation.time);

	for (const annotation of ordered) {
		const x = getX(annotation.time);
		const tier = tierLastX.findIndex((lastX) => x - lastX >= annotationTierGap);

		// Every tier is taken, so this label could only land on one already placed
		if (tier === -1) continue;

		tierLastX[tier] = x;

		marks.push({
			x: round(x),
			// Hung left so the closing mark cannot run off the plot, clamped so the opening one cannot either
			labelX: round(
				Math.max(x - annotationLabelGap, buildStatsLayout.marginLeft + annotationTierGap),
			),
			labelY: durationFrame.top + 14 + tier * 17,
			label: annotation.label,
		});
	}

	return marks;
}

export function getBuildStatsGeometry(
	allRecords: Array<BuildRecord>,
	{ daysLimit, trendWindowDays }: { daysLimit: number; trendWindowDays: number },
): BuildStatsGeometry | undefined {
	const records = getRecentBuildRecords(allRecords, daysLimit);
	const times = records.map((record) => new Date(record.timestamp).getTime());
	const firstTime = times.at(0);
	const lastTime = times.at(-1);

	if (firstTime === undefined || lastTime === undefined) return undefined;

	const domainStart = firstTime - axisPaddingDays * millisecondsPerDay;
	const getX = scaleLinear()
		.domain([domainStart, lastTime])
		.range([buildStatsLayout.marginLeft, plotRight]);

	const durations = records.map((record) => record.durationSeconds);

	// Log scale is load-bearing: on a linear axis one early outlier flattens every recent build
	const durationDomainMin = Math.min(...durations) / 1.08;
	const durationDomainMax = Math.max(...durations) * 1.08;

	const durationScale = scaleLog()
		.domain([durationDomainMin, durationDomainMax])
		.range([durationFrame.bottom, durationFrame.top]);

	const trend = getRollingMedian(records, trendWindowDays);
	const trendByDay = new Map(
		trend.filter((point) => point !== undefined).map((point) => [point.time, point.value]),
	);
	const trendEnd = trend.findLast((point) => point !== undefined);

	const durationPoints = records.map((record, index) => {
		const time = times[index] ?? firstTime;
		const median = trendByDay.get(getUtcDayStart(time));

		return {
			x: round(getX(time)),
			y: round(durationScale(record.durationSeconds)),
			values: [
				getDateDisplay(new Date(time), undefined, tooltipDateOptions),
				formatBuildDuration(record.durationSeconds),
				median === undefined ? '' : formatBuildDuration(median),
			],
		};
	});

	const pagePoints = records.flatMap((record, index) =>
		record.pageCount === undefined
			? []
			: [{ time: times[index] ?? firstTime, value: record.pageCount }],
	);

	return {
		axisTicks: utcMonth.range(new Date(domainStart), new Date(lastTime)).map((month, index) => ({
			x: round(getX(month.getTime())),
			label: month.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
			// Anywhere but the opening tick and each January, the year is noise
			yearLabel:
				index === 0 || month.getUTCMonth() === 0 ? String(month.getUTCFullYear()) : undefined,
		})),
		duration: {
			ticks: durationTicks
				.filter((tick) => tick.seconds >= durationDomainMin && tick.seconds <= durationDomainMax)
				.map((tick) => ({ y: round(durationScale(tick.seconds)), label: tick.label })),
			points: durationPoints,
			trendPath: getPolylinePath(
				trend.map((point) =>
					point === undefined ? undefined : { x: getX(point.time), y: durationScale(point.value) },
				),
			),
			end: trendEnd
				? {
						cx: round(getX(trendEnd.time)),
						cy: round(durationScale(trendEnd.value)),
						label: formatBuildDuration(trendEnd.value),
					}
				: undefined,
			annotations: getAnnotationMarks(getBuildAnnotations(records), getX),
		},
		pages: getPagesGeometry(pagePoints, getX),
	};
}
