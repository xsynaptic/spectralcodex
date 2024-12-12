import type { TimelineSpan } from '@/lib/timeline/timeline-types';

const getPaddedDate = (number: number): string => number.toString().padStart(2, '0');

const getDateParts = (date: Date): { year: string; month: string; day: string } => ({
	year: date.getFullYear().toString(),
	// Note: Months are zero-based (0 for January), so we add 1 to get the correct month
	// Then we pad the value so we always have two digits
	month: getPaddedDate(date.getUTCMonth() + 1),
	day: getPaddedDate(date.getUTCDate()),
});

// Generate slugs for different combinations of year, month, and day
export const getTimelineSlugs = (date: Date): string[] => {
	const { year, month, day } = getDateParts(date);

	return [year, `${year}/${month}`, `${year}/${month}/${day}`];
};

// Generate a slug representing the year and month for a given date
export const getTimelineMonthlySlug = (date: Date): string => {
	const { year, month } = getDateParts(date);

	return `${year}/${month}`;
};

// Generate a slug only for the year of a give date
export const getTimelineYearlySlug = (date: Date): string => {
	const { year } = getDateParts(date);

	return year;
};

export const getTimelineSpan = (slug: string): TimelineSpan => {
	const depth = slug.split('/').length - 1;

	switch (depth) {
		case 2: {
			return 'day';
		}
		case 1: {
			return 'month';
		}
		default: {
			return 'year';
		}
	}
};
