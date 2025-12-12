import type { UnresolvedImageTransform } from 'astro';
import type { CollectionEntry } from 'astro:content';

import { transformMarkdown } from '@spectralcodex/unified-tools';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import pLimit from 'p-limit';
import pMemoize from 'p-memoize';

import type { ImageThumbnail } from '#lib/schemas/image.ts';

import { IMAGE_FORMAT, IMAGE_QUALITY } from '#constants.ts';
import { getImageByIdFunction } from '#lib/collections/images/utils.ts';
import { getGenerateNearbyItemsFunction } from '#lib/collections/locations/data-nearby.ts';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { getCacheInstance, hashData } from '#lib/utils/cache.ts';
import { getContentUrl } from '#lib/utils/routing.ts';

interface CollectionData {
	locations: Array<CollectionEntry<'locations'>>;
	locationsMap: Map<string, CollectionEntry<'locations'>>;
}

const cacheInstance = getCacheInstance('locations-map-data');

async function generateLocationPostDataFunction() {
	const posts = await getCollection('posts');

	return function getLocationPostData(entry: CollectionEntry<'locations'>) {
		entry.data.posts = posts
			.filter((post) => post.data.locations?.some((location) => location.id === entry.id))
			.map(({ id }) => id);
		entry.data.postCount = entry.data.posts.length;
	};
}

const imageTransformOptions = {
	width: 450,
	height: 300,
	widths: [450, 600, 900],
	format: IMAGE_FORMAT,
	quality: IMAGE_QUALITY,
} satisfies Omit<UnresolvedImageTransform, 'src'>;

async function generateLocationImageData(locations: Array<CollectionEntry<'locations'>>) {
	const getImageById = await getImageByIdFunction();

	const limit = pLimit(100);

	// Add image data to locations; for use with the mapping system
	await Promise.all(
		locations
			.filter((entry) => !!entry.data.imageFeatured)
			.map((entry) =>
				limit(async () => {
					if (entry.data.imageFeatured) {
						const imageEntry = getImageById(
							getImageFeaturedId({ imageFeatured: entry.data.imageFeatured }),
						);

						if (imageEntry) {
							const imageObject = await getImage({
								src: imageEntry.data.src,
								...imageTransformOptions,
							});

							// Directly add some basic image data to the location entry
							entry.data.imageThumbnail = {
								src: imageObject.src,
								srcSet: imageObject.srcSet.attribute,
								height: String(imageObject.attributes.height),
								width: String(imageObject.attributes.width),
							} satisfies ImageThumbnail;
						}
					}
				}),
			),
	);

	// Add image data to sub-locations; same as above
	await Promise.all(
		locations
			.filter((entry) => Array.isArray(entry.data.geometry))
			.map((entry) =>
				limit(async () => {
					if (Array.isArray(entry.data.geometry)) {
						for (const [index, geometry] of entry.data.geometry.entries()) {
							if (!entry.data.geometry[index]) continue;

							// Null overrides the main `imageFeatured` and shows no thumbnail
							// This is used in cases where there is no image for the sub-location
							if (geometry.imageFeatured === null) {
								// eslint-disable-next-line unicorn/no-null
								entry.data.geometry[index].imageThumbnail = null;
								continue;
							}

							if (geometry.imageFeatured) {
								const imageEntry = getImageById(geometry.imageFeatured);

								if (imageEntry) {
									const imageObject = await getImage({
										src: imageEntry.data.src,
										...imageTransformOptions,
									});

									// Directly add some basic image data to the geometry entry
									entry.data.geometry[index].imageThumbnail = {
										src: imageObject.src,
										srcSet: imageObject.srcSet.attribute,
										height: String(imageObject.attributes.height),
										width: String(imageObject.attributes.width),
									} satisfies ImageThumbnail;
								}
							}
						}
					}
				}),
			),
	);
}

async function generateLocationMapData(entry: CollectionEntry<'locations'>) {
	const locationMapDataHash = hashData({
		data: {
			id: entry.id,
			title: entry.data.title,
			description: entry.data.description,
			links: entry.data.links,
		},
		short: true,
	});

	entry.data.uuid = locationMapDataHash;
	entry.data.url = getContentUrl('locations', entry.id);
	entry.data.googleMapsUrl = entry.data.links?.find(({ title }) => title === 'Google Maps')?.url;
	entry.data.wikipediaUrl = entry.data.links?.find(({ title }) =>
		title.startsWith('Wikipedia'),
	)?.url;

	const cachedDescriptionHtml = await cacheInstance.get<string>(locationMapDataHash);

	if (cachedDescriptionHtml) {
		entry.data.descriptionHtml = cachedDescriptionHtml;
	} else {
		entry.data.descriptionHtml = transformMarkdown({ input: entry.data.description });
		await cacheInstance.set(locationMapDataHash, entry.data.descriptionHtml);
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
		generateNearbyItems?.(entry);
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
