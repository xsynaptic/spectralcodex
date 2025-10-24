import type { Units } from '@turf/helpers';
import type { UnresolvedImageTransform } from 'astro';
import type { CollectionEntry } from 'astro:content';

import { GeometryTypeEnum } from '@spectralcodex/map-types';
import { transformMarkdown } from '@spectralcodex/unified-tools';
import {
	booleanIntersects,
	centroid,
	buffer as getBuffer,
	distance as getDistance,
	point as getPoint,
} from '@turf/turf';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { nanoid } from 'nanoid';
import pLimit from 'p-limit';

import type { ImageThumbnail } from '#lib/schemas/image.ts';

import { FEATURE_LOCATION_NEARBY_ITEMS, IMAGE_FORMAT, IMAGE_QUALITY } from '#constants.ts';
import { getImageByIdFunction } from '#lib/collections/images/utils.ts';
import { getImageFeaturedId } from '#lib/image/image-featured.ts';
import { getContentUrl } from '#lib/utils/routing.ts';

interface CollectionData {
	locations: Array<CollectionEntry<'locations'>>;
	locationsMap: Map<string, CollectionEntry<'locations'>>;
}

const LOCATIONS_NEARBY_COUNT_LIMIT = 25; // Max number of locations returned
const LOCATIONS_NEARBY_DISTANCE_LIMIT = 10; // Everything within 10 km
const LOCATIONS_NEARBY_DISTANCE_UNITS: Units = 'kilometers';

let collection: Promise<CollectionData> | undefined;

// A simple function for creating reliable IDs for distance pair calculations
function getDistanceId(idA: string, idB: string) {
	return [idA, idB].sort().join('-');
}

function getLocationNearbyDistances(locations: Array<CollectionEntry<'locations'>>) {
	// In-memory cache of distances; this way we can do half the number of operations
	// Because for single points, A<->B is the same as B<->A
	const distances = new Map<string, number>();

	// Currently we only calculate nearby locations for Point geometry
	// This operation also simplifies the data structure to just the essentials
	const points = locations.map((entry) => {
		return Array.isArray(entry.data.geometry)
			? {
					id: entry.id,
					coordinates: centroid({
						type: GeometryTypeEnum.MultiPoint,
						coordinates: entry.data.geometry.map((point) => point.coordinates),
					}).geometry.coordinates,
				}
			: {
					id: entry.id,
					coordinates: entry.data.geometry.coordinates,
				};
	});

	// Calculate distances between all points
	for (let i = 0; i < points.length; i++) {
		const entryA = points[i];

		if (!entryA) continue;

		// This buffer allows us to simplify operations and only consider points within a certain range
		// This is a little expensive but for large number of points actually saves us time
		const buffer = getBuffer(getPoint(entryA.coordinates), LOCATIONS_NEARBY_DISTANCE_LIMIT, {
			units: LOCATIONS_NEARBY_DISTANCE_UNITS,
		});

		if (!buffer) continue;

		for (let j = i + 1; j < points.length; j++) {
			const entryB = points[j];

			if (!entryB) continue;

			if (booleanIntersects(buffer, getPoint(entryB.coordinates))) {
				const distanceId = getDistanceId(entryA.id, entryB.id);
				const distance = distances.get(distanceId);

				if (!distance) {
					const distanceValue = getDistance(entryA.coordinates, entryB.coordinates, {
						units: LOCATIONS_NEARBY_DISTANCE_UNITS,
					});

					distances.set(distanceId, distanceValue);
				}
			}
		}
	}

	return { distances, points };
}

// This calculation is expensive; disable it with a feature flag if needed
function getGenerateNearbyItemsFunction(locations: Array<CollectionEntry<'locations'>>) {
	if (!FEATURE_LOCATION_NEARBY_ITEMS) return;

	const { distances, points } = getLocationNearbyDistances(locations);

	// Now return the function that handles the calculation for a specific location
	return function generateNearbyItems(entry: CollectionEntry<'locations'>) {
		const nearby = points
			.map((point) => {
				if (entry.id === point.id) return;

				const distanceId = getDistanceId(entry.id, point.id);
				const distance = distances.get(distanceId);

				return distance && distance > 0
					? {
							locationId: point.id,
							distance,
							distanceDisplay: distance.toFixed(2),
						}
					: undefined;
			})
			.filter((item) => !!item)
			.sort((a, b) => a.distance - b.distance)
			.slice(
				0,
				LOCATIONS_NEARBY_COUNT_LIMIT,
			) satisfies CollectionEntry<'locations'>['data']['nearby'];

		// If we have nearby points let's add data to the actual location entry
		if (nearby.length > 0) {
			entry.data.nearby = nearby;
		}
	};
}

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

function generateLocationMapData(entry: CollectionEntry<'locations'>) {
	entry.data.uuid = nanoid();
	entry.data.url = getContentUrl('locations', entry.id);
	entry.data.googleMapsUrl = entry.data.links?.find(({ title }) => title === 'Google Maps')?.url;
	entry.data.wikipediaUrl = entry.data.links?.find(({ title }) =>
		title.startsWith('Wikipedia'),
	)?.url;
	entry.data.descriptionHtml = transformMarkdown({ input: entry.data.description });
}

// Nearby location data is expensive to calculate
// To reduce the cost we use buffer zones to reduce the overall number of operations performed
// We also stash distance pairs in a Map to further cut calculations by half
async function generateCollection() {
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
		generateLocationMapData(entry);
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

export async function getLocationsCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
