import type { CollectionEntry } from 'astro:content';

import { hashShort } from '@spectralcodex/shared/cache';
import { getSqliteCacheInstance } from '@spectralcodex/shared/cache/sqlite';
import { transformMarkdown } from '@xsynaptic/unified-tools';
import { getCollection } from 'astro:content';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import pMemoize from 'p-memoize';

import type { ImageThumbnail } from '#lib/schemas/index.ts';

import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import { getGenerateNearbyItemsFunction } from '#lib/collections/locations/locations-nearby.js';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { getIpxImageUrl } from '#lib/image/image-server.ts';
import { ImageSizeEnum } from '#lib/image/image-types.ts';
import { getMatchingLinkUrl } from '#lib/schemas/resources.ts';
import { getContentUrl } from '#lib/utils/routing.ts';

interface CollectionData {
	locations: Array<CollectionEntry<'locations'>>;
	locationsMap: Map<string, CollectionEntry<'locations'>>;
}

const cacheInstance = getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'locations-map-data');

async function generateLocationPostDataFunction() {
	const posts = await getCollection('posts');

	return function getLocationPostData(entry: CollectionEntry<'locations'>) {
		entry.data._posts = posts
			.filter((post) => post.data.locations?.some((location) => location.id === entry.id))
			.map(({ id }) => id);
		entry.data._postCount = entry.data._posts.length;
	};
}

/**
 * Generate thumbnail data with srcSet for map popups using IPX
 * We pass this data via the API so URLs can be signed at build time
 */
const imageThumbnailOptions = {
	width: ImageSizeEnum.ExtraSmall,
	height: 300,
	widths: [ImageSizeEnum.ExtraSmall, ImageSizeEnum.Small, ImageSizeEnum.Medium],
};

function getLocationThumbnailProps(
	imageSrc: string,
	sourceWidth: number,
	sourceHeight: number,
): ImageThumbnail {
	const { height, width, widths } = imageThumbnailOptions;

	// Filter widths to avoid upscaling
	const clampedWidths = widths.filter((width) => width <= sourceWidth);
	const clampedWidth = Math.min(width, sourceWidth);

	return {
		src: getIpxImageUrl(imageSrc, { width: clampedWidth, sourceWidth, sourceHeight }),
		srcSet: clampedWidths
			.map(
				(width) =>
					`${getIpxImageUrl(imageSrc, { width, sourceWidth, sourceHeight })} ${String(width)}w`,
			)
			.join(', '),
		height: String(height),
		width: String(clampedWidth),
	};
}

async function generateLocationImageData(locations: Array<CollectionEntry<'locations'>>) {
	const getImageById = await getImageByIdFunction();

	// Add image data to locations; for use with the mapping system
	for (const entry of locations) {
		if (entry.data.imageFeatured) {
			const imageEntry = getImageById(
				getImageFeaturedId({ imageFeatured: entry.data.imageFeatured }),
			);

			if (imageEntry) {
				entry.data._imageThumbnail = getLocationThumbnailProps(
					imageEntry.id,
					imageEntry.data.width,
					imageEntry.data.height,
				);
			}
		}
	}

	// Add image data to sub-locations; same as above
	for (const entry of locations) {
		if (Array.isArray(entry.data.geometry)) {
			for (const [index, geometry] of entry.data.geometry.entries()) {
				if (!entry.data.geometry[index]) continue;

				// Null overrides the main `imageFeatured` and shows no thumbnail
				// This is used in cases where there is no image for the sub-location
				if (geometry.imageFeatured === null) {
					// eslint-disable-next-line unicorn/no-null
					entry.data.geometry[index]._imageThumbnail = null;
					continue;
				}

				if (geometry.imageFeatured) {
					const imageEntry = getImageById(geometry.imageFeatured);

					if (imageEntry) {
						entry.data.geometry[index]._imageThumbnail = getLocationThumbnailProps(
							imageEntry.id,
							imageEntry.data.width,
							imageEntry.data.height,
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
			description: entry.data.description,
			links: entry.data.links,
		},
	});

	entry.data._uuid = locationMapDataHash;
	entry.data._url = getContentUrl('locations', entry.id);
	entry.data._googleMapsUrl = getMatchingLinkUrl('maps.app.goo.gl', entry.data.links);
	entry.data._wikipediaUrl = getMatchingLinkUrl('wikipedia.org', entry.data.links);

	const cachedDescriptionHtml = await cacheInstance.get<string>(locationMapDataHash);

	if (cachedDescriptionHtml) {
		entry.data._descriptionHtml = cachedDescriptionHtml;
	} else {
		entry.data._descriptionHtml = transformMarkdown({ input: entry.data.description });
		await cacheInstance.set(locationMapDataHash, entry.data._descriptionHtml);
	}
}

/**
 * Nearby location data is expensive to calculate
 * To reduce the cost we use buffer zones to reduce the overall number of operations performed
 * We also stash distance pairs in a Map to further cut calculations by half
 */
async function generateCollection(): Promise<CollectionData> {
	const startTime = performance.now();

	const locations = await getCollection('locations');

	const locationsFiltered = import.meta.env.DEV
		? locations
		: locations.filter((location) => !location.data.hideLocation);

	const generateLocationPostData = await generateLocationPostDataFunction();
	const generateNearbyItems = getGenerateNearbyItemsFunction(locationsFiltered);

	// Loop through every item in the collection and add metadata
	for (const entry of locations) {
		generateLocationPostData(entry);
		await generateLocationMapData(entry);
		generateNearbyItems(entry);
	}

	await generateLocationImageData(locations);

	const locationsMap = new Map<string, CollectionEntry<'locations'>>();

	for (const entry of locations) {
		locationsMap.set(entry.id, entry);
	}

	console.log(
		`[Locations] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { locations, locationsMap };
}

export const getLocationsCollection = pMemoize(generateCollection);
