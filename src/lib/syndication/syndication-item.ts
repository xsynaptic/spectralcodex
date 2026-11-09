import type { SyndicationImage, SyndicationItem } from '@xsynaptic/astro-syndication';

import { getPublicId } from '@spectralcodex/shared/entries';
import { getImagePresetSize, imageContentTypes, imagePresets } from '@spectralcodex/shared/images';
import { anchorDateOnly } from '@xsynaptic/astro-syndication';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import { siteTimezoneOffsetHours } from '#constants.ts';
import { getImageByIdFunction, getImageSource } from '#lib/collections/images/images-data.ts';
import { createRegionAncestorsByIdFunction } from '#lib/collections/regions/regions-data.ts';
import { createThemesByIdsFunction } from '#lib/collections/themes/themes-data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { formatTitleMultilingual, getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { getImageFeedWidth } from '#lib/image/image-layout.ts';
import { createImageUrlFunction } from '#lib/image/image-url.ts';
import { createRenderSyndicationContentFunction } from '#lib/syndication/syndication-render.ts';
import { getSyndicationTags } from '#lib/syndication/syndication-tags.ts';
import { getDescriptionRenderedText } from '#lib/utils/description-data.ts';
import { getAbsoluteUrl, getContentPath } from '#lib/utils/routing.ts';
import { sanitizeImageAltAttribute } from '#lib/utils/text.ts';

type SyndicationEntry = ComputedEntry<'locations' | 'posts'>;

function getSiteDate(date: Date) {
	return anchorDateOnly(date, { utcOffsetHours: siteTimezoneOffsetHours });
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

export async function createSyndicationItemFunction() {
	const renderSyndicationContent = await createRenderSyndicationContentFunction();
	const getSyndicationImage = await createSyndicationImageFunction();
	const getRegionAncestorsById = await createRegionAncestorsByIdFunction();
	const getThemesByIds = await createThemesByIdsFunction();
	const authors = [{ name: getTranslations()('author.name') }];

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
		const contentHtml = await renderSyndicationContent(entry);
		const description = getDescriptionRenderedText(entry);
		const image = getSyndicationImage(entry);

		return {
			authors,
			dateCreated: getSiteDate(data.dateCreated),
			tags: getEntryTags(data),
			title: formatTitleMultilingual(data.title, titleMultilingual),
			url: getAbsoluteUrl(getContentPath(entry.collection, getPublicId(entry))),
			...(contentHtml ? { contentHtml } : {}),
			...(data.dateUpdated ? { dateUpdated: getSiteDate(data.dateUpdated) } : {}),
			...(description ? { description } : {}),
			...(image ? { image } : {}),
		} satisfies SyndicationItem;
	};
}
