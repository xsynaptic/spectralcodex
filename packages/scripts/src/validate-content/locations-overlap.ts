import { around as getPointsAround, distance as getDistance } from 'geokdbush';
import GeospatialIndex from 'kdbush';

import type { DataStoreEntry } from '../shared/data-store';
import type { ValidationResult } from './validation-result';

import { LocationGeometrySchema } from '../shared/geometry';

interface IndexedPoint {
	locationId: string;
	lng: number;
	lat: number;
}

interface LocationOverlap {
	idA: string;
	idB: string;
	distance: number;
}

function collectPoints(entries: Array<DataStoreEntry>) {
	const points: Array<IndexedPoint> = [];

	let locationCount = 0;

	for (const entry of entries) {
		const geometry = LocationGeometrySchema.safeParse(entry.data.geometry);

		if (!geometry.success) continue;

		locationCount++;

		const coordinates = Array.isArray(geometry.data)
			? geometry.data.map((point) => point.coordinates)
			: [geometry.data.coordinates];

		for (const [lng, lat] of coordinates) {
			points.push({ locationId: entry.id, lng, lat });
		}
	}

	return { points, locationCount };
}

function buildSpatialIndex(points: Array<IndexedPoint>) {
	const index = new GeospatialIndex(points.length);

	for (const point of points) {
		index.add(point.lng, point.lat);
	}

	index.finish();

	return index;
}

function findOverlaps(points: Array<IndexedPoint>, thresholdMeters: number) {
	const index = buildSpatialIndex(points);
	const thresholdKm = thresholdMeters / 1000;

	const overlaps: Array<LocationOverlap> = [];
	const seenPairs = new Set<string>();

	for (const point of points) {
		const nearbyIds = getPointsAround(index, point.lng, point.lat, Infinity, thresholdKm);

		for (const nearbyId of nearbyIds) {
			const nearby = points[nearbyId];

			if (!nearby || nearby.locationId === point.locationId) continue;

			// Canonical pair key, so A-B and B-A are reported once
			const pairKey = [point.locationId, nearby.locationId]
				.sort((idA, idB) => idA.localeCompare(idB))
				.join('|');

			if (seenPairs.has(pairKey)) continue;

			seenPairs.add(pairKey);

			const distanceMeters = getDistance(point.lng, point.lat, nearby.lng, nearby.lat) * 1000;

			if (distanceMeters < thresholdMeters) {
				overlaps.push({
					idA: point.locationId,
					idB: nearby.locationId,
					distance: distanceMeters,
				});
			}
		}
	}

	return overlaps.sort((overlapA, overlapB) => overlapA.distance - overlapB.distance);
}

export function validateLocationsOverlap(entries: Array<DataStoreEntry>, thresholdMeters: number) {
	const { points, locationCount } = collectPoints(entries);
	const overlaps = findOverlaps(points, thresholdMeters);

	const scope = `checked ${String(locationCount)} locations, ${String(points.length)} points`;

	if (overlaps.length === 0) {
		return {
			status: 'pass',
			summary: `No overlapping locations found (${scope})`,
			issues: [],
		} satisfies ValidationResult;
	}

	return {
		status: 'warn',
		summary: `Found ${String(overlaps.length)} overlap(s) (${scope})`,
		issues: overlaps.map((overlap) => ({
			message: `${overlap.idA}: overlaps ${overlap.idB} (${overlap.distance.toFixed(1)}m)`,
		})),
	} satisfies ValidationResult;
}
