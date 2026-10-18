import type { CollectionEntry } from 'astro:content';
import type { Position } from 'geojson';

import { GeometryTypeEnum, LocationStatusEnum } from '@spectralcodex/shared/map';
import { centroid } from '@turf/centroid';
import { distance as getDistance, around as getPointsAround } from 'geokdbush';
import GeospatialIndex from 'kdbush';

import { locationsNearbyCountLimit, locationsNearbyDistanceLimit } from '#constants.ts';

export interface LocationsNearbyItem {
	distance: number;
	distanceDisplay: string;
	locationId: string;
}

interface NearbyIndexPoint {
	id: string;
	lat: number;
	lng: number;
	status: string;
}

/**
 * Use geokdbush for O(n log n) spatial queries to avoid any sort of O(n²) issues
 * Post-query filtering handles status checks (vanished, etc.)
 */
export function createLocationNearbyFunction(locations: Array<CollectionEntry<'locations'>>) {
	const { pointsIndex, pointsMap } = extractPoints(locations);

	// Build spatial index from all points (no pre-filtering)
	const index = new GeospatialIndex(pointsIndex.length);

	for (const point of pointsIndex) {
		index.add(point.lng, point.lat);
	}

	index.finish();

	function collectNearbyItems(entryPoint: NearbyIndexPoint): Array<LocationsNearbyItem> {
		// Query for more than we need to account for post-filtering
		const pointsAroundIds = getPointsAround(
			index,
			entryPoint.lng,
			entryPoint.lat,
			locationsNearbyCountLimit * 2,
			locationsNearbyDistanceLimit,
		);

		const nearby: Array<LocationsNearbyItem> = [];

		for (const pointsAroundId of pointsAroundIds) {
			const point = pointsIndex[pointsAroundId];

			// Skip invalid points and self
			if (!point || point.id === entryPoint.id) continue;

			// Post-index filtering: skip vanished locations
			if (point.status === LocationStatusEnum.Vanished) continue;

			const dist = getDistance(entryPoint.lng, entryPoint.lat, point.lng, point.lat);

			if (dist > 0) {
				nearby.push({
					distance: dist,
					distanceDisplay: dist.toFixed(2),
					locationId: point.id,
				});
			}

			if (nearby.length >= locationsNearbyCountLimit) break;
		}

		return nearby;
	}

	return function getLocationNearby(entry: CollectionEntry<'locations'>) {
		const entryPoint = pointsMap.get(entry.id);

		return entryPoint ? collectNearbyItems(entryPoint) : [];
	};
}

// Extract coordinates from location entries; handles both single Point and MultiPoint geometries
function extractPoints(locations: Array<CollectionEntry<'locations'>>): {
	pointsIndex: Array<NearbyIndexPoint>;
	pointsMap: Map<string, NearbyIndexPoint>;
} {
	const pointsMap = new Map<string, NearbyIndexPoint>();
	const pointsIndex: Array<NearbyIndexPoint> = [];

	for (const entry of locations) {
		const coordinates = getEntryCoordinates(entry.data.geometry);

		const lng = coordinates[0];
		const lat = coordinates[1];

		if (lng === undefined || lat === undefined) continue;

		const point: NearbyIndexPoint = {
			id: entry.id,
			lat,
			lng,
			status: entry.data.status,
		};

		pointsMap.set(entry.id, point);
		pointsIndex.push(point);
	}

	return { pointsIndex, pointsMap };
}

// Single Point geometries use their own coordinates; MultiPoint geometries use their centroid
function getEntryCoordinates(geometry: CollectionEntry<'locations'>['data']['geometry']): Position {
	if (Array.isArray(geometry)) {
		return centroid({
			coordinates: geometry.map((point) => point.coordinates),
			type: GeometryTypeEnum.MultiPoint,
		}).geometry.coordinates;
	}
	return geometry.coordinates;
}
