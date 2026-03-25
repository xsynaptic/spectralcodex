import * as R from 'remeda';

import { createCollectionData } from '#lib/utils/collections.ts';
import { createFilterEntryQualityFunction } from '#lib/utils/collections.ts';
import { sortByDateReverseChronological } from '#lib/utils/date.ts';

export const getNotesCollection = createCollectionData({
	collection: 'notes',
	label: 'Notes',
});

export async function queryNotesIndex() {
	const { entries } = await getNotesCollection();

	return R.pipe(
		entries,
		R.filter(createFilterEntryQualityFunction(2)),
		R.sort(sortByDateReverseChronological),
	);
}
