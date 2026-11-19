import type { OpenGraphVariant } from '@spectralcodex/shared/open-graph';
import type { ShareKitAsset, ShareKitPayload, ShareKitSettings } from '@xsynaptic/share-kit';

import {
	getImagePresetWidths,
	imageContentTypes,
	imagePresets,
} from '@spectralcodex/shared/images';
import {
	getOpenGraphCardPath,
	getOpenGraphId,
	openGraphImageFormat,
	openGraphVariants,
} from '@spectralcodex/shared/open-graph';
import pMemoize from 'p-memoize';

import type { ShareDialogDestination } from '#components/share/share-dialog-destinations.ts';
import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import { getImageByIdFunction, getImageSource } from '#lib/collections/images/images-data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { getImageFeaturedIds } from '#lib/image/image-featured.ts';
import { createImageUrlFunction } from '#lib/image/image-url.ts';
import { getDescriptionRenderedText } from '#lib/utils/description-data.ts';
import { getAbsoluteUrl, getBasePath, getContentPath } from '#lib/utils/routing.ts';
import { createEntryCardFunction } from '#lib/utils/seo-cards.ts';
import { formatStringTemplate, sanitizeImageAltAttribute } from '#lib/utils/text.ts';

export type ShareableEntry = ComputedEntry<'locations' | 'posts' | 'regions' | 'series' | 'themes'>;

type ShareDialogPhotoEntry = ComputedEntry<'locations' | 'posts'>;

const shareDialogCardVariants = {
	full: ['portrait', 'story', 'landscape'],
	landscape: ['landscape'],
} as const satisfies Record<string, ReadonlyArray<OpenGraphVariant>>;

const filenamePrefix = 'spectral-codex';

const photoFileWidth = 1800;

const photoPreviewWidth = 600;

const shareDialogSettings = {
	destinations: [
		'any',
		'threads',
		'facebook',
		'instagram',
		'instagram-story',
		'x',
		'bluesky',
		'mastodon',
		'reddit',
	],
	openHash: 'share',
	utmMedium: 'share',
} as const satisfies ShareKitSettings<ShareDialogDestination>;

function isPhotoEntry(entry: ShareableEntry): entry is ShareDialogPhotoEntry {
	return entry.collection === 'locations' || entry.collection === 'posts';
}

function getWidthAtMost(widths: ReadonlyArray<number>, limit: number) {
	return widths.findLast((width) => width <= limit) ?? widths[0];
}

async function createPhotosFunction() {
	const getImageById = await getImageByIdFunction();
	const t = getTranslations();

	return function getPhotos(entry: ShareDialogPhotoEntry, id: string) {
		const imageSources = getImageFeaturedIds(entry.data.imageFeatured).flatMap((imageId) => {
			const imageEntry = getImageById(imageId);

			return imageEntry ? [{ imageEntry, imageSource: getImageSource(imageEntry) }] : [];
		});

		return imageSources.flatMap(({ imageEntry, imageSource }, index): Array<ShareKitAsset> => {
			const widths = getImagePresetWidths('content', imageSource);
			const fileWidth = getWidthAtMost(widths, photoFileWidth);
			const previewWidth = getWidthAtMost(widths, photoPreviewWidth);

			if (fileWidth === undefined || previewWidth === undefined) return [];

			const getImageUrl = createImageUrlFunction({ imageSource, preset: 'content' });
			const number = String(index + 1);

			return [
				{
					alt: sanitizeImageAltAttribute(imageEntry.data.title),
					filename: `${filenamePrefix}-${id}-${number}.${imagePresets.content.format}`,
					height: Math.round((previewWidth * imageSource.height) / imageSource.width),
					id: `photo-${number}`,
					isSuggestable: false,
					label:
						imageSources.length === 1
							? t('share.dialog.photo.labelSingle')
							: formatStringTemplate(t('share.dialog.photo.label'), { number }),
					previewSrc: getImageUrl(previewWidth),
					src: getImageUrl(fileWidth),
					type: imageContentTypes[imagePresets.content.format],
					width: previewWidth,
				},
			];
		});
	};
}

// Every card path requested here gets rendered, so an Entry without a usable photo only gets the landscape card it already has
async function createShareDialogDataFunction() {
	const getEntryCard = await createEntryCardFunction();
	const getPhotos = await createPhotosFunction();
	const t = getTranslations();

	return function getShareDialogData(
		entry: ShareableEntry,
	): ShareKitPayload<ShareDialogDestination> {
		const card = getEntryCard(entry);
		const id = getOpenGraphId(card.id);
		const { title } = entry.data;
		const description = getDescriptionRenderedText(entry);
		const photoEntry = !card.image.isBlurred && isPhotoEntry(entry) ? entry : undefined;
		const variants = shareDialogCardVariants[photoEntry ? 'full' : 'landscape'];

		return {
			assets: [
				...variants.map((variant): ShareKitAsset => {
					const src = getBasePath(getOpenGraphCardPath(card, variant));
					const label = t(`share.dialog.card.${variant}`);

					return {
						...openGraphVariants[variant],
						alt: `${title}, ${label.toLowerCase()}`,
						filename: `${filenamePrefix}-${id}-${variant}.${openGraphImageFormat}`,
						id: variant,
						label,
						previewSrc: src,
						src,
						type: imageContentTypes[openGraphImageFormat],
					};
				}),
				...(photoEntry ? getPhotos(photoEntry, id) : []),
			],
			...(description ? { description } : {}),
			locale: 'en',
			settings: shareDialogSettings,
			title,
			// The Entry's own URL, so page 3 of a Region, Theme or Series shares page 1
			url: getAbsoluteUrl(getContentPath(entry.collection, card.id)),
		};
	};
}

export const getShareDialogDataFunction = pMemoize(createShareDialogDataFunction);
