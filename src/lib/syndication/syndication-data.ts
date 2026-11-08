import * as R from 'remeda';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createSyndicationItemFunction } from '#lib/syndication/syndication-item.ts';
import { isFeaturedQuality, isListed } from '#lib/utils/content-policy.ts';
import { sortByDateReverseChronological } from '#lib/utils/date.ts';

export async function getSyndicationItems({
	itemCount,
	shouldExcludeFootnotes,
}: {
	itemCount: number;
	shouldExcludeFootnotes: boolean;
}) {
	const getSyndicationItem = await createSyndicationItemFunction({ shouldExcludeFootnotes });

	const { entries: locations } = await getLocationsCollection();
	const { entries: posts } = await getPostsCollection();

	const entries = R.pipe(
		[
			...posts.filter((entry) => isFeaturedQuality(entry.data)),
			...locations.filter((entry) => isListed(entry.data) && isFeaturedQuality(entry.data)),
		],
		R.sort(sortByDateReverseChronological),
		R.take(itemCount),
	);

	return Promise.all(entries.map((entry) => getSyndicationItem(entry)));
}
