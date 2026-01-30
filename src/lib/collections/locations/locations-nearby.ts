import type { CollectionEntry } from 'astro:content';

import { GeometryTypeEnum, LocationStatusEnum } from '@spectralcodex/map-types';
import { centroid } from '@turf/centroid';
import { around as getPointsAround, distance as getDistance } from 'geokdbush';
import GeospatialIndex from 'kdbush';

import type { LocationsNearbyItem } from '#lib/collections/locations/locations-schemas.ts';

import { LOCATIONS_NEARBY_COUNT_LIMIT, LOCATIONS_NEARBY_DISTANCE_LIMIT } from '#constants.ts';

interface LocationPoint {
	id: string;
	lng: number;
	lat: number;
	status: string;
}

/**
 * Extract coordinates from location entries; handles both single Point and MultiPoint geometries
 */
function extractPoints(locations: Array<CollectionEntry<'locations'>>): {
	pointsMap: Map<string, LocationPoint>;
	pointsIndex: Array<LocationPoint>;
} {
	const pointsMap = new Map<string, LocationPoint>();
	const pointsIndex: Array<LocationPoint> = [];

	for (const entry of locations) {
		const coordinates = Array.isArray(entry.data.geometry)
			? centroid({
					type: GeometryTypeEnum.MultiPoint,
					coordinates: entry.data.geometry.map((point) => point.coordinates),
				}).geometry.coordinates
			: entry.data.geometry.coordinates;

		const lng = coordinates[0];
		const lat = coordinates[1];

		if (lng === undefined || lat === undefined) continue;

		const point: LocationPoint = {
			id: entry.id,
			lng,
			lat,
			status: entry.data.status,
		};

		pointsMap.set(entry.id, point);
		pointsIndex.push(point);
	}

	return { pointsMap, pointsIndex };
}

/**
 * Use geokdbush for O(n log n) spatial queries to avoid any sort of O(n²) issues
 * Post-query filtering handles status checks (demolished, etc.)
 */
export function getGenerateNearbyItemsFunction(locations: Array<CollectionEntry<'locations'>>) {
	const { pointsMap, pointsIndex } = extractPoints(locations);

	// Build spatial index from all points (no pre-filtering)
	const index = new GeospatialIndex(pointsIndex.length);

	for (const point of pointsIndex) {
		index.add(point.lng, point.lat);
	}

	index.finish();

	return function generateNearbyItems(entry: CollectionEntry<'locations'>) {
		const entryPoint = pointsMap.get(entry.id);

		if (!entryPoint) return;

		// Query for more than we need to account for post-filtering
		const pointsAroundIds = getPointsAround(
			index,
			entryPoint.lng,
			entryPoint.lat,
			LOCATIONS_NEARBY_COUNT_LIMIT * 2,
			LOCATIONS_NEARBY_DISTANCE_LIMIT,
		);

		const nearby: Array<LocationsNearbyItem> = [];

		for (const pointsAroundId of pointsAroundIds) {
			const point = pointsIndex[pointsAroundId];

			// Skip invalid points and self
			if (!point || point.id === entry.id) continue;

			// Post-index filtering: skip demolished locations
			if (point.status === LocationStatusEnum.Demolished) continue;

			const dist = getDistance(entryPoint.lng, entryPoint.lat, point.lng, point.lat);

			if (dist > 0) {
				nearby.push({
					locationId: point.id,
					distance: dist,
					distanceDisplay: dist.toFixed(2),
				});
			}

			if (nearby.length >= LOCATIONS_NEARBY_COUNT_LIMIT) break;
		}

		if (nearby.length > 0) {
			entry.data._nearby = nearby;
		}
	};
}
