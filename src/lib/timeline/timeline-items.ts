import * as R from 'remeda';

import type { ContentMetadataItem } from '@/types/metadata';

import { getEphemeraCollection } from '@/lib/collections/ephemera/data';
import { getLocationsCollection } from '@/lib/collections/locations/data';
import { getPostsCollection } from '@/lib/collections/posts/data';
import { getContentMetadataFunction } from '@/lib/metadata/metadata-items';
import { sortContentMetadataByDate } from '@/lib/metadata/metadata-utils';
import { getTimelineSlugs, getTimelineYearlySlug } from '@/lib/timeline/timeline-utils';
import { getFilterEntryQualityFunction } from '@/lib/utils/collections';

const getTimelineMetadata = async (): Promise<Array<ContentMetadataItem>> => {
	const { ephemera } = await getEphemeraCollection();
	const { locations } = await getLocationsCollection();
	const { posts } = await getPostsCollection();

	const getContentMetadata = await getContentMetadataFunction();

	const ephemeraMetadata = R.pipe(ephemera, getContentMetadata);
	const locationsMetadata = R.pipe(
		locations,
		R.filter(getFilterEntryQualityFunction(2)),
		getContentMetadata,
	);
	const postsMetadata = R.pipe(posts, getContentMetadata);

	const timelineMetadata = [...ephemeraMetadata, ...locationsMetadata, ...postsMetadata].sort(
		sortContentMetadataByDate,
	);

	return timelineMetadata;
};

// Generate date routes from an arbitrary timeline collection
export async function getTimelineItemsMap() {
	const timelineItemsMap = new Map<string, Array<ContentMetadataItem>>();

	const timelineItems = await getTimelineMetadata();

	if (timelineItems.length > 0) {
		for (const timelineItem of timelineItems) {
			const timelineSlugs = getTimelineSlugs(timelineItem.date);

			for (const timelineSlug of timelineSlugs) {
				if (!timelineItemsMap.has(timelineSlug)) {
					timelineItemsMap.set(timelineSlug, []);
				}
				timelineItemsMap.get(timelineSlug)?.push(timelineItem);
			}
		}
	}
	return timelineItemsMap;
}

// Generate date routes from an arbitrary timeline collection
export async function getTimelineYearlyMap() {
	const timelineItemsMap = new Map<string, Array<ContentMetadataItem>>();

	const timelineItems = await getTimelineMetadata();

	if (timelineItems.length > 0) {
		for (const timelineItem of timelineItems) {
			const timelineSlug = getTimelineYearlySlug(timelineItem.date);

			if (!timelineItemsMap.has(timelineSlug)) {
				timelineItemsMap.set(timelineSlug, []);
			}
			timelineItemsMap.get(timelineSlug)?.push(timelineItem);
		}
	}
	return timelineItemsMap;
}
