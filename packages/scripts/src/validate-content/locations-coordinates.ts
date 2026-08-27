import type { Feature, MultiPolygon, Polygon } from 'geojson';

import { booleanPointInPolygon, point } from '@turf/turf';
import chalk from 'chalk';
import { geojson } from 'flatgeobuf';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { DataStoreEntry } from '../shared/data-store';

import { toReferenceIds } from '../shared/data-store';
import { LocationGeometrySchema } from '../shared/geometry';

async function loadRegionGeometry(
	regionId: string,
	divisionsPath: string,
): Promise<Array<Feature<Polygon | MultiPolygon>>> {
	const fgbPath = path.join(divisionsPath, `${regionId}.fgb`);

	try {
		const buffer = await fs.readFile(fgbPath);
		const uint8Array = new Uint8Array(buffer);

		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(uint8Array);
				controller.close();
			},
		});

		const featuresIterator = geojson.deserialize(stream);
		const features: Array<Feature<Polygon | MultiPolygon>> = [];

		for await (const feature of featuresIterator) {
			if (['MultiPolygon', 'Polygon'].includes(feature.geometry.type)) {
				features.push(feature as Feature<Polygon | MultiPolygon>);
			}
		}
		return features;
	} catch (error) {
		throw new Error(
			`Failed to load FGB file for region "${regionId}": ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
	}
}

function isPointInRegion(
	coordinates: [number, number],
	regionFeatures: Array<Feature<Polygon | MultiPolygon>>,
): boolean {
	const testPoint = point(coordinates);

	for (const feature of regionFeatures) {
		if (booleanPointInPolygon(testPoint, feature)) {
			return true;
		}
	}

	return false;
}

// A missing FGB file disqualifies that region for the whole run
function createRegionGeometryLoader(divisionsPath: string) {
	const cache = new Map<string, Array<Feature<Polygon | MultiPolygon>>>();
	const missingRegions = new Set<string>();

	async function getRegionFeatures(regionId: string, reportMissing: boolean) {
		if (missingRegions.has(regionId)) return;

		const cached = cache.get(regionId);

		if (cached) return cached;

		try {
			const features = await loadRegionGeometry(regionId, divisionsPath);

			cache.set(regionId, features);

			return features;
		} catch {
			if (reportMissing) {
				console.log(
					chalk.yellow(
						`⚠️  ${regionId}: could not load FGB file, skipping all other locations in this region`,
					),
				);
			}

			missingRegions.add(regionId);

			return;
		}
	}

	return { getRegionFeatures, missingRegions };
}

export async function checkLocationsCoordinates(
	entries: Array<DataStoreEntry>,
	divisionsPath: string,
) {
	let mismatchCount = 0;
	let missingFgbCount = 0;
	let checkedCount = 0;

	const { getRegionFeatures, missingRegions } = createRegionGeometryLoader(divisionsPath);

	for (const entry of entries) {
		if (entry.data.skipCoordinateCheck === true) continue;

		const regions = toReferenceIds(entry.data.regions);

		const geometryResult = LocationGeometrySchema.safeParse(entry.data.geometry);

		if (!geometryResult.success) {
			continue;
		}

		const geometries = Array.isArray(geometryResult.data)
			? geometryResult.data
			: [geometryResult.data];

		const validRegions: Array<string> = [];
		const allRegionFeatures: Array<Feature<Polygon | MultiPolygon>> = [];

		for (const region of regions) {
			// Only warn when the entry has no other region to check against
			const regionFeatures = await getRegionFeatures(region, regions.length === 1);

			if (!regionFeatures) continue;

			validRegions.push(region);
			allRegionFeatures.push(...regionFeatures);
		}

		if (validRegions.length === 0) {
			missingFgbCount++;
			continue;
		}

		let hasInvalidCoordinate = false;

		for (const geometry of geometries) {
			const coordinates = geometry.coordinates;
			const isInside = isPointInRegion(coordinates, allRegionFeatures);

			if (!isInside) {
				console.log(
					chalk.red(
						`❌ ${entry.id}: [${String(coordinates[0])}, ${String(coordinates[1])}] not in region(s): ${validRegions.join(', ')}`,
					),
				);
				hasInvalidCoordinate = true;
			}
		}

		if (hasInvalidCoordinate) mismatchCount++;
		checkedCount++;
	}

	if (mismatchCount === 0 && checkedCount > 0) {
		console.log(
			chalk.green(
				`✓ ${checkedCount.toString()} valid location coordinates (${missingFgbCount.toString()} skipped)`,
			),
		);
		return true;
	}
	if (checkedCount === 0) {
		console.log(chalk.yellow('⚠️  No locations could be checked'));
		return false;
	}
	console.log(chalk.yellow(`⚠️  Found ${mismatchCount.toString()} coordinate mismatch(es)`));
	if (missingRegions.size > 0) {
		console.log(
			chalk.gray(
				`Missing FGB regions: ${[...missingRegions].sort((regionA, regionB) => regionA.localeCompare(regionB)).join(', ')}`,
			),
		);
	}
	return false;
}
