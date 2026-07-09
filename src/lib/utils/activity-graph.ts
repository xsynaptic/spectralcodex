import { MILLISECONDS_PER_DAY } from '#constants.ts';
import { getDayKey } from '#lib/utils/date.ts';

interface ActivityGraphDay {
	date: Date;
	value: number;
	level: number;
	future: boolean;
}

interface ActivityGraphMonthLabel {
	name: string;
	week: number;
}

export interface ActivityGraphData {
	days: Array<ActivityGraphDay>;
	monthLabels: Array<ActivityGraphMonthLabel>;
	padCount: number;
	weekCount: number;
}

interface BuildActivityGraphOptions {
	year: string;
	// Day key ('YYYY-MM-DD') to event count for the year
	values: Record<string, number>;
	// Days after this instant have no history yet; usually the build date
	referenceDate: Date;
}

// Intensity bin 0-4 for one day; 0 = no events, 4 = the year's busiest day
// Log scale: event counts are heavy-tailed, so a lone huge day would flatten every
// busy-but-not-peak day to one shade under a linear scale; log keeps the texture
export function getActivityLevel(count: number, max: number): number {
	if (count <= 0 || max <= 0) return 0;

	const level = Math.ceil((4 * Math.log(count + 1)) / Math.log(max + 1));

	return Math.min(4, Math.max(1, level));
}

// Everything the graph needs to render one year: cells, month lines, and leading pad count
// A flat chronological day list; the CSS grid flows it into weeks
export function buildActivityGraph({
	year,
	values,
	referenceDate,
}: BuildActivityGraphOptions): ActivityGraphData {
	const yearNumber = Number(year);
	const yearStart = Date.UTC(yearNumber, 0, 1);
	const yearEnd = Date.UTC(yearNumber + 1, 0, 1);

	const todayUtc = Date.UTC(
		referenceDate.getUTCFullYear(),
		referenceDate.getUTCMonth(),
		referenceDate.getUTCDate(),
	);

	const days: Array<ActivityGraphDay> = [];
	let max = 0;

	for (let time = yearStart; time < yearEnd; time += MILLISECONDS_PER_DAY) {
		const date = new Date(time);
		const value = values[getDayKey(date)] ?? 0;
		const future = time > todayUtc;

		// Future days can't set the scale; it should reflect actual past activity
		if (!future && value > max) max = value;

		days.push({ date, value, level: 0, future });
	}

	for (const day of days) {
		if (day.future) continue;
		day.level = getActivityLevel(day.value, max);
	}

	// Pad cells push Jan 1 to its weekday so each week starts on Sunday
	const padCount = new Date(yearStart).getUTCDay();
	const weekCount = Math.ceil((padCount + days.length) / 7);

	// Month labels sit at the week line where each month begins (1-based grid line)
	const monthLabels = Array.from({ length: 12 }, (_, month): ActivityGraphMonthLabel => {
		const firstOfMonth = Date.UTC(yearNumber, month, 1);
		const dayIndex = Math.round((firstOfMonth - yearStart) / MILLISECONDS_PER_DAY);

		return {
			name: new Date(firstOfMonth).toLocaleDateString('en-US', {
				month: 'short',
				timeZone: 'UTC',
			}),
			week: Math.floor((padCount + dayIndex) / 7) + 1,
		};
	});

	return { days, monthLabels, padCount, weekCount };
}
