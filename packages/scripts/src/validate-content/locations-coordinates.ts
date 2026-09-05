import type { Feature, MultiPolygon, Polygon } from 'geojson';

import { booleanPointInPolygon, point } from '@turf/turf';
import { geojson } from 'flatgeobuf';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { ContentEntry } from '#shared/astro-content.ts';

import { toReferenceIds } from '#shared/entries.ts';
import { LocationGeometrySchema } from '#shared/geometry.ts';

import type { ValidationResult } from './validation-result.ts';

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
	const unloadableRegions: Array<string> = [];

	async function getRegionFeatures(regionId: string, shouldReportMissing: boolean) {
		if (missingRegions.has(regionId)) return;

		const cached = cache.get(regionId);

		if (cached) return cached;

		try {
			const features = await loadRegionGeometry(regionId, divisionsPath);

			cache.set(regionId, features);

			return features;
		} catch {
			if (shouldReportMissing) unloadableRegions.push(regionId);

			missingRegions.add(regionId);

			return;
		}
	}

	return { getRegionFeatures, missingRegions, unloadableRegions };
}

type RegionFeatures = Array<Feature<Polygon | MultiPolygon>>;

function getEntryGeometries(entry: ContentEntry) {
	const result = LocationGeometrySchema.safeParse(entry.data.geometry);

	if (!result.success) return;

	return Array.isArray(result.data) ? result.data : [result.data];
}

async function collectRegionFeatures(
	regions: Array<string>,
	getRegionFeatures: (
		regionId: string,
		shouldReportMissing: boolean,
	) => Promise<RegionFeatures | undefined>,
) {
	const validRegions: Array<string> = [];
	const features: RegionFeatures = [];

	for (const region of regions) {
		// Only warn when the entry has no other region to check against
		const regionFeatures = await getRegionFeatures(region, regions.length === 1);

		if (!regionFeatures) continue;

		validRegions.push(region);
		features.push(...regionFeatures);
	}

	return { validRegions, features };
}

function collectEntryMismatches(
	entry: ContentEntry,
	geometries: Array<{ coordinates: [number, number] }>,
	features: RegionFeatures,
	validRegions: Array<string>,
): Array<string> {
	const mismatches: Array<string> = [];

	for (const { coordinates } of geometries) {
		if (isPointInRegion(coordinates, features)) continue;

		mismatches.push(
			`${entry.id}: [${String(coordinates[0])}, ${String(coordinates[1])}] not in region(s): ${validRegions.join(', ')}`,
		);
	}

	return mismatches;
}

async function collectCoordinateFindings(entries: Array<ContentEntry>, divisionsPath: string) {
	const mismatches: Array<string> = [];

	let mismatchCount = 0;
	let missingFgbCount = 0;
	let checkedCount = 0;

	const { getRegionFeatures, missingRegions, unloadableRegions } =
		createRegionGeometryLoader(divisionsPath);

	for (const entry of entries) {
		if (entry.data.skipCoordinateCheck === true) continue;

		const geometries = getEntryGeometries(entry);

		if (!geometries) continue;

		const regions = toReferenceIds(entry.data.regions);
		const { validRegions, features } = await collectRegionFeatures(regions, getRegionFeatures);

		if (validRegions.length === 0) {
			missingFgbCount++;
			continue;
		}

		const entryMismatches = collectEntryMismatches(entry, geometries, features, validRegions);

		if (entryMismatches.length > 0) {
			mismatches.push(...entryMismatches);
			mismatchCount++;
		}

		checkedCount++;
	}

	return {
		mismatches,
		mismatchCount,
		missingFgbCount,
		checkedCount,
		missingRegions,
		unloadableRegions,
	};
}

export async function validateLocationsCoordinates(
	entries: Array<ContentEntry>,
	divisionsPath: string,
) {
	const {
		mismatches,
		mismatchCount,
		missingFgbCount,
		checkedCount,
		missingRegions,
		unloadableRegions,
	} = await collectCoordinateFindings(entries, divisionsPath);

	const notes = unloadableRegions.map(
		(regionId) =>
			`${regionId}: could not load FGB file, skipping all other locations in this region`,
	);

	if (checkedCount === 0) {
		return {
			status: 'fail',
			summary: 'No locations could be checked',
			issues: [],
			notes,
		} satisfies ValidationResult;
	}

	if (mismatchCount === 0) {
		return {
			status: 'pass',
			summary: `${checkedCount.toString()} valid location coordinates (${missingFgbCount.toString()} skipped)`,
			issues: [],
			notes,
		} satisfies ValidationResult;
	}

	const sortedMissingRegions = [...missingRegions].sort((regionA, regionB) =>
		regionA.localeCompare(regionB),
	);

	return {
		status: 'fail',
		summary: `Found ${mismatchCount.toString()} coordinate mismatch(es)`,
		issues: mismatches.map((message) => ({ message })),
		notes:
			sortedMissingRegions.length > 0
				? [...notes, `Missing FGB regions: ${sortedMissingRegions.join(', ')}`]
				: notes,
	} satisfies ValidationResult;
}
