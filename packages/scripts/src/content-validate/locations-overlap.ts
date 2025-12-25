#!/usr/bin/env tsx
import { distance as getDistance, point as getPoint } from '@turf/turf';
import chalk from 'chalk';
import { z } from 'zod';

import { parseContentFiles } from '../content-utils';

const SingleGeometrySchema = z.object({
	coordinates: z.tuple([z.number(), z.number()]),
});

const GeometrySchema = z.union([SingleGeometrySchema, z.array(SingleGeometrySchema)]);

interface LocationData {
	id: string;
	coordinates: Array<[number, number]>;
}

export async function checkLocationsOverlap(locationsPath: string, thresholdMeters: number) {
	console.log(
		chalk.blue(
			`🔍 Checking location overlaps in ${locationsPath} (threshold: ${String(thresholdMeters)}m)`,
		),
	);

	const parsedFiles = await parseContentFiles(locationsPath);

	// Extract all locations with their points
	const locations: Array<LocationData> = [];

	for (const parsedFile of parsedFiles) {
		const geometry = GeometrySchema.safeParse(parsedFile.frontmatter.geometry);

		if (!geometry.success) {
			continue;
		}

		locations.push({
			id: parsedFile.id,
			coordinates: Array.isArray(geometry.data)
				? geometry.data.map(({ coordinates }) => coordinates)
				: [geometry.data.coordinates],
		});
	}

	// Check all location pairs for overlap (comparing every point against every other point)
	const overlapData: Array<{ idA: string; idB: string; distance: number }> = [];

	for (let i = 0; i < locations.length; i++) {
		const locationA = locations[i];

		if (!locationA) continue;

		for (let j = i + 1; j < locations.length; j++) {
			const locationB = locations[j];

			if (!locationB) continue;

			// Find the minimum distance between any point in A and any point in B
			let minDistance = Number.POSITIVE_INFINITY;

			for (const coordA of locationA.coordinates) {
				for (const coordB of locationB.coordinates) {
					const distanceKm = getDistance(getPoint(coordA), getPoint(coordB), {
						units: 'kilometers',
					});
					const distanceMeters = distanceKm * 1000;

					if (distanceMeters < minDistance) {
						minDistance = distanceMeters;
					}
				}
			}

			if (minDistance < thresholdMeters) {
				overlapData.push({
					idA: locationA.id,
					idB: locationB.id,
					distance: minDistance,
				});
			}
		}
	}

	// Report results
	if (overlapData.length === 0) {
		console.log(
			chalk.green(
				`✓ No overlapping locations found (checked ${String(locations.length)} locations)`,
			),
		);
		return true;
	}

	// Sort by distance (closest first)
	overlapData.sort((a, b) => a.distance - b.distance);

	for (const overlap of overlapData) {
		console.log(
			chalk.yellow(`Warning: overlap detected between ${overlap.idA} and ${overlap.idB}`),
		);
	}

	return true; // Return true since these are warnings, not errors
}
