import type { CollectionEntry } from 'astro:content';

import { hashShort } from '@spectralcodex/shared/cache';
import { IMAGE_SERVER_SECRET } from 'astro:env/server';

import { IMAGE_LQ_FORMAT, IMAGE_LQ_QUALITY } from '#constants.ts';
import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import {
	createGenerateLocationPostDataFunction,
	getLocationThumbnailProps,
} from '#lib/collections/locations/locations-factory.ts';
import { createGenerateNearbyItemsFunction } from '#lib/collections/locations/locations-nearby.js';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { createSignedImagePathFunction } from '#lib/image/image-server.ts';
import { getMatchingLinkUrl } from '#lib/schemas/resources.ts';
import { createCollectionData, getPublicId, getRawCollection } from '#lib/utils/collections.ts';
import { getDescription, getDescriptionRendered } from '#lib/utils/description.ts';
import { getContentUrl } from '#lib/utils/routing.ts';

// Popup thumbnails are stored as signed paths; the popup prepends the image server URL at render time
const getSignedImagePath = createSignedImagePathFunction({
	imageQuality: IMAGE_LQ_QUALITY,
	imageFormat: IMAGE_LQ_FORMAT,
	serverSecret: IMAGE_SERVER_SECRET,
});

async function generateLocationImageData(locations: Array<CollectionEntry<'locations'>>) {
	const getImageById = await getImageByIdFunction();

	// Add image data to locations; for use with the mapping system
	for (const entry of locations) {
		if (!entry.data.imageFeatured) {
			continue;
		}

		const imageEntry = getImageById(
			getImageFeaturedId({ imageFeatured: entry.data.imageFeatured }),
		);

		if (imageEntry) {
			entry.data._imageThumbnail = getLocationThumbnailProps(
				imageEntry.id,
				imageEntry.data.width,
				getSignedImagePath,
			);
		}
	}

	// Add image data to sub-locations; same as above
	for (const entry of locations) {
		if (Array.isArray(entry.data.geometry)) {
			for (const geometry of entry.data.geometry) {
				// Null overrides the main `imageFeatured` and shows no thumbnail
				// This is used in cases where there is no image for the sub-location
				if (geometry.imageFeatured === null) {
					// eslint-disable-next-line unicorn/no-null -- null deliberately overrides imageFeatured to render no thumbnail
					geometry._imageThumbnail = null;
					continue;
				}

				if (geometry.imageFeatured) {
					const imageEntry = getImageById(geometry.imageFeatured);

					if (imageEntry) {
						geometry._imageThumbnail = getLocationThumbnailProps(
							imageEntry.id,
							imageEntry.data.width,
							getSignedImagePath,
						);
					}
				}
			}
		}
	}
}

async function generateLocationMapData(entry: CollectionEntry<'locations'>) {
	const locationMapDataHash = hashShort({
		data: {
			id: entry.id,
			title: entry.data.title,
			description: getDescription(entry),
			links: entry.data.links,
		},
	});

	entry.data._uuid = locationMapDataHash;
	entry.data._url = getContentUrl('locations', getPublicId(entry));
	entry.data._googleMapsUrl = getMatchingLinkUrl('maps.app.goo.gl', entry.data.links);
	entry.data._wikipediaUrl = getMatchingLinkUrl('wikipedia.org', entry.data.links);

	const rendered = await getDescriptionRendered(entry);

	if (rendered) {
		entry.data._descriptionHtml = rendered.html;
	}
}

/**
 * Nearby location data is expensive to calculate
 * To reduce the cost we use buffer zones to reduce the overall number of operations performed
 * We also stash distance pairs in a Map to further cut calculations by half
 */
export const getLocationsCollection = createCollectionData({
	collection: 'locations',
	label: 'Locations',
	async mutate(entries) {
		// Flatten overrides onto entry.data in production so downstream code never needs to know
		if (import.meta.env.PROD) {
			for (const entry of entries) {
				if (!entry.data.override) continue;

				// Exclude override ID from flattening; getPublicId() reads it separately
				const { id: _, ...overrideFields } = entry.data.override;

				Object.assign(entry.data, overrideFields);
			}
		}

		const locationsFiltered = import.meta.env.DEV
			? entries
			: entries.filter((location) => !location.data.hideLocation);

		const posts = await getRawCollection('posts');
		const generateLocationPostData = createGenerateLocationPostDataFunction(posts);
		const generateNearbyItems = createGenerateNearbyItemsFunction(locationsFiltered);

		// Loop through every item in the collection and add metadata
		for (const entry of entries) {
			generateLocationPostData(entry);
			await generateLocationMapData(entry);
			generateNearbyItems(entry);
		}

		await generateLocationImageData(entries);
	},
});
