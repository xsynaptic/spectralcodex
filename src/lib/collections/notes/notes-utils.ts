import * as R from 'remeda';

import { getNotesCollection } from '#lib/collections/notes/notes-data.ts';
import { createFilterEntryQualityFunction } from '#lib/utils/collections.ts';
import { sortByDateReverseChronological } from '#lib/utils/date.ts';

export async function queryNotesIndex() {
	const { entries } = await getNotesCollection();

	return R.pipe(
		entries,
		R.filter(createFilterEntryQualityFunction(2)),
		R.sort(sortByDateReverseChronological),
	);
}
