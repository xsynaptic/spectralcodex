import type { ContentEntry } from '@xsynaptic/astro-scripts';

import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

import type { DivisionGeometry } from '#map-divisions/types.ts';
import type { ValidationResult } from '#validate-content/validation-result.ts';

import { getDivisionIds } from '#map-divisions/content.ts';
import { getDivisionDataCache } from '#map-divisions/geojson-cache.ts';
import { toReferenceIds } from '#shared/entries.ts';
import { LocationGeometrySchema } from '#shared/geometry.ts';

interface RegionCoverage {
	geometries: Array<DivisionGeometry>;
	validRegions: Array<string>;
}

export async function validateLocationsCoordinates(
	entries: Array<ContentEntry>,
	regionEntries: Array<ContentEntry>,
	divisionsPath: string,
) {
	const {
		checkedCount,
		mismatchCount,
		mismatches,
		missingGeometryCount,
		missingRegions,
		unloadableRegions,
	} = await collectCoordinateFindings(entries, regionEntries, divisionsPath);

	const notes = unloadableRegions.map(
		(regionId) =>
			`${regionId}: could not load Division geometry, skipping all other locations in this region`,
	);

	if (checkedCount === 0) {
		return {
			issues: [],
			notes,
			status: 'fail',
			summary: 'No locations could be checked',
		} satisfies ValidationResult;
	}

	if (mismatchCount === 0) {
		return {
			issues: [],
			notes,
			status: 'pass',
			summary: `${checkedCount.toString()} valid location coordinates (${missingGeometryCount.toString()} skipped)`,
		} satisfies ValidationResult;
	}

	const sortedMissingRegions = [...missingRegions].toSorted((regionA, regionB) =>
		regionA.localeCompare(regionB),
	);

	return {
		issues: mismatches.map((message) => ({ message })),
		notes:
			sortedMissingRegions.length > 0
				? [...notes, `Regions missing Division geometry: ${sortedMissingRegions.join(', ')}`]
				: notes,
		status: 'fail',
		summary: `Found ${mismatchCount.toString()} coordinate mismatch(es)`,
	} satisfies ValidationResult;
}

async function collectCoordinateFindings(
	entries: Array<ContentEntry>,
	regionEntries: Array<ContentEntry>,
	divisionsPath: string,
) {
	const mismatches: Array<string> = [];

	let mismatchCount = 0;
	let missingGeometryCount = 0;
	let checkedCount = 0;

	const divisionIdsByRegion = new Map(
		regionEntries.map((region) => [region.id, getDivisionIds(region)]),
	);

	const { getRegionGeometries, missingRegions, unloadableRegions } = createRegionGeometryLoader(
		divisionIdsByRegion,
		divisionsPath,
	);

	for (const entry of entries) {
		if (entry.data.skipCoordinateCheck === true) continue;

		const locationGeometries = getEntryGeometries(entry);

		if (!locationGeometries) continue;

		const regions = toReferenceIds(entry.data.regions);
		const coverage = await collectRegionGeometries(regions, getRegionGeometries);

		if (coverage.validRegions.length === 0) {
			missingGeometryCount++;
			continue;
		}

		const entryMismatches = collectEntryMismatches(entry, locationGeometries, coverage);

		if (entryMismatches.length > 0) {
			mismatches.push(...entryMismatches);
			mismatchCount++;
		}

		checkedCount++;
	}

	return {
		checkedCount,
		mismatchCount,
		mismatches,
		missingGeometryCount,
		missingRegions,
		unloadableRegions,
	};
}

function collectEntryMismatches(
	entry: ContentEntry,
	locationGeometries: Array<{ coordinates: [number, number] }>,
	{ geometries, validRegions }: RegionCoverage,
): Array<string> {
	const mismatches: Array<string> = [];

	for (const { coordinates } of locationGeometries) {
		if (isPointInRegion(coordinates, geometries)) continue;

		mismatches.push(
			`${entry.id}: [${String(coordinates[0])}, ${String(coordinates[1])}] not in region(s): ${validRegions.join(', ')}`,
		);
	}

	return mismatches;
}

async function collectRegionGeometries(
	regions: Array<string>,
	getRegionGeometries: (
		regionId: string,
		shouldReportMissing: boolean,
	) => Promise<Array<DivisionGeometry> | undefined>,
): Promise<RegionCoverage> {
	const validRegions: Array<string> = [];
	const geometries: Array<DivisionGeometry> = [];

	for (const region of regions) {
		// Only warn when the entry has no other region to check against
		const regionGeometries = await getRegionGeometries(region, regions.length === 1);

		if (!regionGeometries) continue;

		validRegions.push(region);
		geometries.push(...regionGeometries);
	}

	return { geometries, validRegions };
}

function createRegionGeometryLoader(
	divisionIdsByRegion: Map<string, Array<string>>,
	divisionsPath: string,
) {
	const cache = new Map<string, Array<DivisionGeometry>>();
	const missingRegions = new Set<string>();
	const unloadableRegions: Array<string> = [];

	async function getRegionGeometries(regionId: string, shouldReportMissing: boolean) {
		if (missingRegions.has(regionId)) return;

		const cached = cache.get(regionId);

		if (cached) return cached;

		const geometries = await loadRegionGeometries(
			divisionIdsByRegion.get(regionId) ?? [],
			divisionsPath,
		);

		if (!geometries) {
			if (shouldReportMissing) unloadableRegions.push(regionId);

			missingRegions.add(regionId);

			return;
		}

		cache.set(regionId, geometries);

		return geometries;
	}

	return { getRegionGeometries, missingRegions, unloadableRegions };
}

function getEntryGeometries(entry: ContentEntry) {
	const result = LocationGeometrySchema.safeParse(entry.data.geometry);

	if (!result.success) return;

	return Array.isArray(result.data) ? result.data : [result.data];
}

function isPointInRegion(coordinates: [number, number], geometries: Array<DivisionGeometry>) {
	const testPoint = point(coordinates);

	return geometries.some((geometry) => booleanPointInPolygon(testPoint, geometry));
}

async function loadRegionGeometries(divisionIds: Array<string>, divisionsPath: string) {
	if (divisionIds.length === 0) return;

	const geometries: Array<DivisionGeometry> = [];

	for (const divisionId of divisionIds) {
		const division = await getDivisionDataCache(divisionId, divisionsPath);

		if (!division) return;

		geometries.push(division.geometry);
	}

	return geometries;
}
