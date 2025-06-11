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
