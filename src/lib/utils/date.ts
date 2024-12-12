export const parseContentDate = (date: string | Date | undefined) => {
	if (!date) return;
	if (date instanceof Date) return date;
	return new Date(date);
};

interface CollectionEntryWithStandardDates {
	data: {
		dateCreated: string | Date;
		dateUpdated?: string | Date | undefined;
	};
}

// Intended to be a generic sort function for any collection entry with these standard date values
export const sortByDateReverseChronological = (
	a: CollectionEntryWithStandardDates,
	b: CollectionEntryWithStandardDates,
) => {
	const aDate = parseContentDate(a.data.dateUpdated) ?? parseContentDate(a.data.dateCreated);
	const bDate = parseContentDate(b.data.dateUpdated) ?? parseContentDate(b.data.dateCreated);

	if (aDate && bDate) {
		return bDate.getTime() - aDate.getTime();
	}
	return -1;
};
