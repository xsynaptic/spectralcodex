import * as R from 'remeda';

import {
	createContentMetadataFunction,
	sortContentMetadataByDate,
} from '#lib/metadata/metadata-utils.ts';
import { createCollectionData } from '#lib/utils/collections.ts';
import { createFilterEntryQualityFunction } from '#lib/utils/collections.ts';

export const getPostsCollection = createCollectionData({ collection: 'posts', label: 'Posts' });

export async function queryPostsIndex() {
	const { entries } = await getPostsCollection();

	const getContentMetadata = await createContentMetadataFunction();

	return R.pipe(
		entries,
		R.filter(createFilterEntryQualityFunction(2)),
		getContentMetadata,
		R.sort(sortContentMetadataByDate),
	);
}
