import type { Units } from '@turf/helpers';
import type { CollectionEntry } from 'astro:content';
import type { Position } from 'geojson';

import {
	GeometryTypeEnum,
	type LocationStatus,
	LocationStatusEnum,
} from '@spectralcodex/map-types';
import {
	booleanIntersects,
	centroid,
	buffer as getBuffer,
	distance as getDistance,
	point as getPoint,
} from '@turf/turf';

import type { LocationsNearbyItem } from '#lib/collections/locations/locations-schemas.ts';

import { FEATURE_LOCATION_NEARBY_ITEMS } from '#constants.ts';

const LOCATIONS_NEARBY_COUNT_LIMIT = 25; // Max number of locations returned
const LOCATIONS_NEARBY_DISTANCE_LIMIT = 10; // Everything within 10 km
const LOCATIONS_NEARBY_DISTANCE_UNITS: Units = 'kilometers';

interface LocationNearbyData {
	distances: Map<string, number>;
	points: Array<{
		id: string;
		status: LocationStatus;
		coordinates: Position;
	}>;
}

// A simple function for creating reliable IDs for distance pair calculations
function getDistanceId(idA: string, idB: string) {
	return [idA, idB].sort().join('-');
}

function getLocationNearbyDistances(
	locations: Array<CollectionEntry<'locations'>>,
): LocationNearbyData {
	// In-memory cache of distances; this way we can do half the number of operations
	// Because for single points, A<->B is the same as B<->A
	const distances = new Map<string, number>();

	// Currently we only calculate nearby locations for Point geometry
	// This operation also simplifies the data structure to just the essentials
	const points = locations.map((entry) => {
		return Array.isArray(entry.data.geometry)
			? {
					id: entry.id,
					status: entry.data.status,
					coordinates: centroid({
						type: GeometryTypeEnum.MultiPoint,
						coordinates: entry.data.geometry.map((point) => point.coordinates),
					}).geometry.coordinates,
				}
			: {
					id: entry.id,
					status: entry.data.status,
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
export function getGenerateNearbyItemsFunction(locations: Array<CollectionEntry<'locations'>>) {
	if (!FEATURE_LOCATION_NEARBY_ITEMS) return;

	const { distances, points } = getLocationNearbyDistances(locations);

	// Now return the function that handles the calculation for a specific location
	// Note: we ignore demolished locations
	return function generateNearbyItems(entry: CollectionEntry<'locations'>) {
		const nearby = points
			.filter((point) => point.status !== LocationStatusEnum.Demolished)
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
			.slice(0, LOCATIONS_NEARBY_COUNT_LIMIT) satisfies Array<LocationsNearbyItem>;

		// If we have nearby points let's add data to the actual location entry
		if (nearby.length > 0) {
			entry.data._nearby = nearby;
		}
	};
}
