import { getPublicId } from '@spectralcodex/shared/entries';
import { getImagePresetSize, imageContentTypes, imagePresets } from '@spectralcodex/shared/images';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import { millisecondsPerHour, siteTimezoneOffsetHours } from '#constants.ts';
import { getImageByIdFunction, getImageSource } from '#lib/collections/images/images-data.ts';
import { createRegionAncestorsByIdFunction } from '#lib/collections/regions/regions-data.ts';
import { createThemesByIdsFunction } from '#lib/collections/themes/themes-data.ts';
import { formatTitleMultilingual, getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { getImageFeedWidth } from '#lib/image/image-layout.ts';
import { createImageUrlFunction } from '#lib/image/image-url.ts';
import { createRenderFeedContentFunction } from '#lib/syndication/syndication-render.ts';
import { getSyndicationTags } from '#lib/syndication/syndication-tags.ts';
import { getDescriptionRenderedText } from '#lib/utils/description-data.ts';
import { getContentPath } from '#lib/utils/routing.ts';
import { sanitizeImageAltAttribute } from '#lib/utils/text.ts';

type SyndicationEntry = ComputedEntry<'locations' | 'posts'>;

export interface SyndicationImage {
	alt: string;
	height: number;
	type: string;
	url: string;
	width: number;
}

export interface SyndicationItem {
	contentHtml?: string;
	dateCreated: Date;
	dateUpdated?: Date;
	description?: string;
	image?: SyndicationImage;
	path: string;
	tags: Array<string>;
	title: string;
}

// Dates sit at 00:00 UTC; re-anchor to the site timezone so today's entries are never future-dated
function getSiteDate(date: Date) {
	return new Date(date.getTime() - siteTimezoneOffsetHours * millisecondsPerHour);
}

async function createSyndicationImageFunction() {
	const getImageById = await getImageByIdFunction();

	return function getSyndicationImage(entry: SyndicationEntry) {
		const imageId = getImageFeaturedId({ imageFeatured: entry.data.imageFeatured });

		if (!imageId) return;

		const imageEntry = getImageById(imageId);

		if (!imageEntry) return;

		const imageSource = getImageSource(imageEntry);
		const size = getImagePresetSize('feed', getImageFeedWidth(imageEntry.data), imageSource);

		if (size.height === undefined) return;

		return {
			alt: sanitizeImageAltAttribute(imageEntry.data.title),
			height: size.height,
			type: imageContentTypes[imagePresets.feed.format],
			url: createImageUrlFunction({ imageSource, preset: 'feed' })(size.width),
			width: size.width,
		} satisfies SyndicationImage;
	};
}

export async function createSyndicationItemFunction({
	shouldExcludeFootnotes,
}: {
	shouldExcludeFootnotes: boolean;
}) {
	const renderFeedContent = await createRenderFeedContentFunction({ shouldExcludeFootnotes });
	const getSyndicationImage = await createSyndicationImageFunction();
	const getRegionAncestorsById = await createRegionAncestorsByIdFunction();
	const getThemesByIds = await createThemesByIdsFunction();

	function getEntryTags({ regions, themes }: SyndicationEntry['data']) {
		return getSyndicationTags({
			getRegionAncestorsById,
			regionIds: regions?.map(({ id }) => id) ?? [],
			themes: getThemesByIds(themes?.map(({ id }) => id) ?? []),
		});
	}

	return async function getSyndicationItem(entry: SyndicationEntry) {
		const { data } = entry;

		const titleMultilingual = getMultilingualContent({ data, prop: 'title' })?.primary;
		const contentHtml = await renderFeedContent(entry);
		const description = getDescriptionRenderedText(entry);
		const image = getSyndicationImage(entry);

		return {
			dateCreated: getSiteDate(data.dateCreated),
			path: getContentPath(entry.collection, getPublicId(entry)),
			tags: getEntryTags(data),
			title: formatTitleMultilingual(data.title, titleMultilingual),
			...(contentHtml ? { contentHtml } : {}),
			...(data.dateUpdated ? { dateUpdated: getSiteDate(data.dateUpdated) } : {}),
			...(description ? { description } : {}),
			...(image ? { image } : {}),
		} satisfies SyndicationItem;
	};
}
