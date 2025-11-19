#!/usr/bin/env tsx
import type { Feature, MultiPolygon, Polygon } from 'geojson';

import { booleanPointInPolygon, point } from '@turf/turf';
import chalk from 'chalk';
import { geojson } from 'flatgeobuf';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { parseContentFiles } from '../content-utils';

const SingleGeometrySchema = z.object({
	coordinates: z.tuple([z.number(), z.number()]),
});

const GeometrySchema = z.union([SingleGeometrySchema, z.array(SingleGeometrySchema)]);

async function loadRegionGeometry(
	regionSlug: string,
	divisionsPath: string,
): Promise<Array<Feature<Polygon | MultiPolygon>>> {
	const fgbPath = path.join(divisionsPath, `${regionSlug}.fgb`);

	try {
		// Read FGB file as buffer
		const buffer = await fs.readFile(fgbPath);
		const uint8Array = new Uint8Array(buffer);

		// Create ReadableStream using Web API
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(uint8Array);
				controller.close();
			},
		});

		// Deserialize FlatGeobuf to GeoJSON features
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
			`Failed to load FGB file for region "${regionSlug}": ${error instanceof Error ? error.message : String(error)}`,
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

export async function checkLocationsCoordinates(locationsPath: string, divisionsPath: string) {
	console.log(chalk.blue('Checking if location coordinates fall within their assigned regions...'));

	const parsedFiles = await parseContentFiles(locationsPath);

	console.log(chalk.gray(`Found ${String(parsedFiles.length)} location files to process...`));

	let mismatchCount = 0;
	let missingFgbCount = 0;
	let checkedCount = 0;

	// Cache loaded region geometries to avoid re-reading files
	const regionGeometryCache = new Map<string, Array<Feature<Polygon | MultiPolygon>>>();
	// Track regions with missing FGB files to skip them entirely
	const missingFgbRegions = new Set<string>();

	for (const parsedFile of parsedFiles) {
		// Parse regions array
		const regions = z.string().array().parse(parsedFile.frontmatter.regions);

		// Parse geometry coordinates
		const geometryResult = GeometrySchema.safeParse(parsedFile.frontmatter.geometry);

		if (!geometryResult.success) {
			continue;
		}

		// Normalize geometry to array format
		const geometries = Array.isArray(geometryResult.data)
			? geometryResult.data
			: [geometryResult.data];

		// Load region geometries for all assigned regions
		const validRegions: Array<string> = [];
		const allRegionFeatures: Array<Feature<Polygon | MultiPolygon>> = [];

		for (const region of regions) {
			// Skip if we already know this region's FGB file is missing
			if (missingFgbRegions.has(region)) {
				continue;
			}

			let regionFeatures: Array<Feature<Polygon | MultiPolygon>>;

			if (regionGeometryCache.has(region)) {
				regionFeatures = regionGeometryCache.get(region)!;
			} else {
				try {
					regionFeatures = await loadRegionGeometry(region, divisionsPath);
					regionGeometryCache.set(region, regionFeatures);
				} catch {
					if (regions.length === 1) {
						// Only report warning if this is the only region
						console.log(
							chalk.yellow(
								`WARNING: Could not load FGB file for region "${region}", skipping all other locations in this region`,
							),
						);
					}
					missingFgbRegions.add(region);
					continue;
				}
			}

			validRegions.push(region);
			allRegionFeatures.push(...regionFeatures);
		}

		// Skip if no valid regions found
		if (validRegions.length === 0) {
			missingFgbCount++;
			continue;
		}

		// Check each coordinate against all valid regions
		let hasInvalidCoordinate = false;
		for (const geometry of geometries) {
			const coordinates = geometry.coordinates;
			const isInside = isPointInRegion(coordinates, allRegionFeatures);

			if (!isInside) {
				console.log(
					chalk.red(
						`${parsedFile.id}: [${String(coordinates[0])}, ${String(coordinates[1])}] not in region(s): ${validRegions.join(', ')}`,
					),
				);
				hasInvalidCoordinate = true;
			}
		}

		if (hasInvalidCoordinate) mismatchCount++;
		checkedCount++;
	}

	console.log(chalk.blue('='.repeat(50)));
	console.log(chalk.blue('Total locations: ' + parsedFiles.length.toString()));
	console.log(chalk.blue('Checked: ' + checkedCount.toString()));
	console.log(chalk.blue('Skipped (no FGB): ' + missingFgbCount.toString()));
	if (missingFgbRegions.size > 0) {
		console.log(chalk.blue('Missing FGB regions: ' + [...missingFgbRegions].sort().join(', ')));
	}
	console.log(chalk.blue('Mismatches: ' + mismatchCount.toString()));

	if (mismatchCount === 0 && checkedCount > 0) {
		console.log(chalk.green('🎉 All checked locations have coordinates within their regions!'));
		return true;
	} else if (checkedCount === 0) {
		console.log(chalk.yellow('⚠️  No locations could be checked'));
		return false;
	} else {
		console.log(
			chalk.yellow(
				'⚠️  Found ' +
					mismatchCount.toString() +
					' location(s) with coordinates outside their region boundaries',
			),
		);
		return false;
	}
}
