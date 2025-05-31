import type { Units } from '@turf/helpers';
import type { CollectionEntry } from 'astro:content';

import {
	booleanIntersects,
	centroid,
	buffer as getBuffer,
	distance as getDistance,
	point as getPoint,
} from '@turf/turf';
import { transformMarkdown } from '@xsynaptic/unified-tools';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { nanoid } from 'nanoid';
import pLimit from 'p-limit';
import { GeometryTypeEnum } from 'packages/map-types/src';

import { FEATURE_LOCATION_NEARBY_ITEMS, IMAGE_FORMAT, IMAGE_QUALITY } from '#constants.ts';
import { getImageByIdFunction } from '#lib/collections/images/utils.ts';
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
						const imageEntry = getImageById(entry.data.imageFeatured);

						if (imageEntry) {
							const imageObject = await getImage({
								src: imageEntry.data.src,
								width: 450,
								height: 300,
								widths: [450, 600, 900],
								format: IMAGE_FORMAT,
								quality: IMAGE_QUALITY,
							});

							// Directly add some basic image data to the location entry
							entry.data.imageThumbnail = {
								src: imageObject.src,
								srcSet: imageObject.srcSet.attribute,
								height: String(imageObject.attributes.height),
								width: String(imageObject.attributes.width),
							} satisfies CollectionEntry<'locations'>['data']['imageThumbnail'];
						}
					}
					return;
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
	entry.data.descriptionHtml = transformMarkdown(entry.data.description);
}

// Nearby location data is expensive to calculate
// To reduce the cost we use buffer zones to reduce the overall number of operations performed
// We also stash distance pairs in a Map to further cut calculations by half
async function generateCollection() {
	const startTime = performance.now();

	const locations = await getCollection('locations');

	const generateLocationPostData = await generateLocationPostDataFunction();
	const generateNearbyItems = getGenerateNearbyItemsFunction(
		locations.filter((location) => !location.data.hideLocation),
	);

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
		`[Locations] Collection data generated in ${Number(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { locations, locationsMap };
}

export async function getLocationsCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
