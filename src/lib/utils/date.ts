export const DatePresetEnum = {
	Short: 'short',
	Medium: 'medium',
	Long: 'long',
} as const;

export type DatePreset = (typeof DatePresetEnum)[keyof typeof DatePresetEnum];

export function parseContentDate(date: string | Date | undefined) {
	if (!date) return;
	if (date instanceof Date) return date;
	return new Date(date);
}

// UTC 'YYYY-MM-DD' key; content dates are UTC instants, so bucket by day in UTC
export function getDayKey(date: Date): string {
	const year = String(date.getUTCFullYear()).padStart(4, '0');
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

interface ContentDate {
	date: Date;
	hasTime: boolean;
}

export type DateRecordedEntry = ContentDate | [ContentDate, ContentDate];

export interface DateRange {
	start: ContentDate;
	end?: ContentDate;
}

export function getDateRanges(entries: Array<DateRecordedEntry>): Array<DateRange> {
	return entries
		.map((entry): DateRange =>
			Array.isArray(entry) ? { start: entry[0], end: entry[1] } : { start: entry },
		)
		.sort((a, b) => a.start.date.valueOf() - b.start.date.valueOf());
}

const ordinalRules = new Intl.PluralRules('en-US', { type: 'ordinal' });

const ordinalSuffixes: Record<Intl.LDMLPluralRule, string> = {
	zero: 'th',
	one: 'st',
	two: 'nd',
	few: 'rd',
	many: 'th',
	other: 'th',
};

function getOrdinalDay(day: number): string {
	return `${String(day)}${ordinalSuffixes[ordinalRules.select(day)]}`;
}

// Ordinal day suffixes only read correctly alongside a month name, not a numeric date
function isMonthNameFormat(options: Intl.DateTimeFormatOptions): boolean {
	return options.month === 'long' || options.month === 'short';
}

function formatDateOrdinal(date: Date, options: Intl.DateTimeFormatOptions): string {
	const formatter = new Intl.DateTimeFormat('en-US', options);

	if (!isMonthNameFormat(options)) return formatter.format(date);

	return formatter
		.formatToParts(date)
		.map((part) => (part.type === 'day' ? getOrdinalDay(Number(part.value)) : part.value))
		.join('');
}

function getYearPart(date: Date, options: Intl.DateTimeFormatOptions): string | undefined {
	return new Intl.DateTimeFormat('en-US', options)
		.formatToParts(date)
		.find((part) => part.type === 'year')?.value;
}

// "May 13th to May 15th, 2018": month repeated, year shown once when both ends share it
export function getDateDisplay(
	date: Date,
	dateEnd: Date | undefined,
	options: Intl.DateTimeFormatOptions,
): string {
	if (!dateEnd) return formatDateOrdinal(date, options);

	if (!isMonthNameFormat(options)) {
		return new Intl.DateTimeFormat('en-US', options).formatRange(date, dateEnd);
	}

	const startOptions: Intl.DateTimeFormatOptions = { ...options };

	if (getYearPart(date, options) === getYearPart(dateEnd, options)) {
		delete startOptions.year;
	}

	return `${formatDateOrdinal(date, startOptions)} to ${formatDateOrdinal(dateEnd, options)}`;
}

interface CollectionEntryWithStandardDates {
	data: {
		dateCreated: string | Date;
		dateUpdated?: string | Date | undefined;
	};
}

// Intended to be a generic sort function for any collection entry with these standard date values
export function sortByDateReverseChronological(
	a: CollectionEntryWithStandardDates,
	b: CollectionEntryWithStandardDates,
) {
	const aDate = parseContentDate(a.data.dateUpdated) ?? parseContentDate(a.data.dateCreated);
	const bDate = parseContentDate(b.data.dateUpdated) ?? parseContentDate(b.data.dateCreated);

	if (aDate && bDate) {
		return bDate.getTime() - aDate.getTime();
	}
	return -1;
}
