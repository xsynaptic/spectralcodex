#!/usr/bin/env tsx
import { GeometrySchema } from '@spectralcodex/shared/schemas';
import chalk from 'chalk';
import { around as getPointsAround, distance as getDistance } from 'geokdbush';
import GeospatialIndex from 'kdbush';

import type { DataStoreEntry } from '../shared/data-store';

interface IndexedPoint {
	locationId: string;
	lng: number;
	lat: number;
}

export function checkLocationsOverlap(entries: Array<DataStoreEntry>, thresholdMeters: number) {
	console.log(chalk.blue(`🔍 Checking location overlaps (threshold: ${String(thresholdMeters)}m)`));

	// Convert threshold to km for geokdbush
	const thresholdKm = thresholdMeters / 1000;

	const points: Array<IndexedPoint> = [];

	let locationCount = 0;

	for (const entry of entries) {
		const geometry = GeometrySchema.safeParse(entry.data.geometry);

		if (!geometry.success) continue;

		locationCount++;

		// Handle both single point and multi-point geometries
		const coords = Array.isArray(geometry.data)
			? geometry.data.map((point) => point.coordinates)
			: [geometry.data.coordinates];

		for (const [lng, lat] of coords) {
			points.push({ locationId: entry.id, lng, lat });
		}
	}

	// Build spatial index of all individual points
	const index = new GeospatialIndex(points.length);

	for (const point of points) {
		index.add(point.lng, point.lat);
	}

	index.finish();

	// Find overlapping location pairs using spatial queries
	const overlapData: Array<{ idA: string; idB: string; distance: number }> = [];
	const coordinatePairs = new Set<string>();

	for (const point of points) {
		// Query for nearby points within threshold
		const nearbyIds = getPointsAround(index, point.lng, point.lat, Infinity, thresholdKm);

		for (const nearbyId of nearbyIds) {
			const nearby = points[nearbyId];

			// Skip invalid points and points from same location
			if (!nearby || nearby.locationId === point.locationId) continue;

			// Create canonical pair key to avoid duplicates (A-B same as B-A)
			const pairKey = [point.locationId, nearby.locationId].sort().join('|');

			if (coordinatePairs.has(pairKey)) continue;

			coordinatePairs.add(pairKey);

			const distanceKm = getDistance(point.lng, point.lat, nearby.lng, nearby.lat);
			const distanceMeters = distanceKm * 1000;

			if (distanceMeters < thresholdMeters) {
				overlapData.push({
					idA: point.locationId,
					idB: nearby.locationId,
					distance: distanceMeters,
				});
			}
		}
	}

	// Report results
	if (overlapData.length === 0) {
		console.log(
			chalk.green(
				`✓ No overlapping locations found (checked ${String(locationCount)} locations, ${String(points.length)} points)`,
			),
		);
		return true;
	}

	// Sort by distance (closest first)
	overlapData.sort((a, b) => a.distance - b.distance);

	for (const overlap of overlapData) {
		console.log(
			chalk.yellow(
				`Warning: overlap detected between ${overlap.idA} and ${overlap.idB} (${overlap.distance.toFixed(1)}m)`,
			),
		);
	}

	console.log(
		chalk.blue(
			`Checked ${String(locationCount)} locations (${String(points.length)} points), found ${String(overlapData.length)} overlaps`,
		),
	);

	// Return true since these are warnings, not errors
	return true;
}
