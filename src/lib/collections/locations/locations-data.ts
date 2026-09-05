import type { CollectionEntry } from 'astro:content';

import { IMAGE_SERVER_SECRET } from 'astro:env/server';
import { hash } from 'ohash';

import type { ImageThumbnail } from '#lib/schemas/index.ts';

import { hashShortLength, imageLowQualityFormat, imageLowQualityValue } from '#constants.ts';
import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import {
	createGenerateLocationPostDataFunction,
	getLocationThumbnailProps,
} from '#lib/collections/locations/locations-factory.ts';
import { createGenerateNearbyItemsFunction } from '#lib/collections/locations/locations-nearby.ts';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { createSignedImagePathFunction } from '#lib/image/image-server.ts';
import { getMatchingLinkUrl } from '#lib/schemas/resources.ts';
import { createCollectionData, getPublicId, getRawCollection } from '#lib/utils/collections.ts';
import { contentPolicy } from '#lib/utils/content-policy.ts';
import { getDescriptionRendered } from '#lib/utils/description-data.ts';
import { getDescription } from '#lib/utils/description.ts';
import { getContentUrl } from '#lib/utils/routing.ts';

// Popup thumbnails are stored as signed paths; the popup prepends the image server URL at render time
const getSignedImagePath = createSignedImagePathFunction({
	imageQuality: imageLowQualityValue,
	imageFormat: imageLowQualityFormat,
	serverSecret: IMAGE_SERVER_SECRET,
});

type GetThumbnailFunction = (imageId: string | undefined) => ImageThumbnail | undefined;

function setEntryThumbnail(
	entry: CollectionEntry<'locations'>,
	getThumbnail: GetThumbnailFunction,
) {
	if (!entry.data.imageFeatured) return;

	const thumbnail = getThumbnail(getImageFeaturedId({ imageFeatured: entry.data.imageFeatured }));

	if (thumbnail) {
		entry.data._imageThumbnail = thumbnail;
	}
}

function setGeometryThumbnails(
	entry: CollectionEntry<'locations'>,
	getThumbnail: GetThumbnailFunction,
) {
	if (!Array.isArray(entry.data.geometry)) return;

	for (const geometry of entry.data.geometry) {
		if (geometry.imageFeatured === null) {
			// eslint-disable-next-line unicorn/no-null -- overrides the entry `imageFeatured` to render no thumbnail
			geometry._imageThumbnail = null;
			continue;
		}

		if (!geometry.imageFeatured) continue;

		const thumbnail = getThumbnail(geometry.imageFeatured);

		if (thumbnail) {
			geometry._imageThumbnail = thumbnail;
		}
	}
}

async function generateLocationImageData(locations: Array<CollectionEntry<'locations'>>) {
	const getImageById = await getImageByIdFunction();

	const getThumbnail: GetThumbnailFunction = (imageId) => {
		const imageEntry = getImageById(imageId);

		return imageEntry
			? getLocationThumbnailProps(imageEntry.id, imageEntry.data.width, getSignedImagePath)
			: undefined;
	};

	for (const entry of locations) {
		setEntryThumbnail(entry, getThumbnail);
		setGeometryThumbnails(entry, getThumbnail);
	}
}

async function generateLocationMapData(entry: CollectionEntry<'locations'>) {
	const locationMapDataHash = hash({
		id: entry.id,
		title: entry.data.title,
		description: getDescription(entry),
		links: entry.data.links,
	}).slice(0, hashShortLength);

	entry.data._uuid = locationMapDataHash;
	entry.data._url = getContentUrl('locations', getPublicId(entry));
	entry.data._googleMapsUrl = getMatchingLinkUrl('maps.app.goo.gl', entry.data.links);
	entry.data._wikipediaUrl = getMatchingLinkUrl('wikipedia.org', entry.data.links);

	const rendered = await getDescriptionRendered(entry);

	if (rendered) {
		entry.data._descriptionHtml = rendered.html;
	}
}

// Nearby data is expensive; buffer zones cut the candidate set and a distance-pair Map halves the rest
export const getLocationsCollection = createCollectionData({
	collection: 'locations',
	label: 'Locations',
	async mutate(entries) {
		// Flatten overrides onto entry.data so downstream code never needs to know
		if (contentPolicy.applyOverrides) {
			for (const entry of entries) {
				if (!entry.data.override) continue;

				// Exclude override ID from flattening; getPublicId() reads it separately
				const { id: _, ...overrideFields } = entry.data.override;

				Object.assign(entry.data, overrideFields);
			}
		}

		// Narrows nearby-item candidates only; `mutate` cannot drop entries from the collection
		const nearbyCandidates = contentPolicy.hideSensitiveLocations
			? entries.filter((location) => !location.data.hideLocation)
			: entries;

		const posts = await getRawCollection('posts');
		const generateLocationPostData = createGenerateLocationPostDataFunction(posts);
		const generateNearbyItems = createGenerateNearbyItemsFunction(nearbyCandidates);

		for (const entry of entries) {
			generateLocationPostData(entry);
			await generateLocationMapData(entry);
			generateNearbyItems(entry);
		}

		await generateLocationImageData(entries);
	},
});
