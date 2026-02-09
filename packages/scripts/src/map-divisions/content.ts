import type { GeometryBoundingBox } from '@spectralcodex/shared/map';

import { GeometryBoundingBoxSchema, GeometryDivisionIdSchema } from '@spectralcodex/shared/map';
import chalk from 'chalk';
import path from 'node:path';

import type { DataStoreEntry } from '../shared/data-store';
import type { RegionMetadata } from './types';

/**
 * Derive regionPathIds (ancestor chain) from filePath
 * e.g. "packages/content/collections/regions/asia/japan/tokyo.mdx"
 * → ["tokyo", "japan", "asia"] (self + ancestors from immediate parent to root)
 */
function getRegionPathIds(filePath: string, slug: string): Array<string> {
	const collectionMarker = 'collections/regions/';
	const idx = filePath.indexOf(collectionMarker);

	if (idx === -1) return [slug];

	const relativePath = filePath.slice(idx + collectionMarker.length);
	const ext = path.extname(relativePath);
	const pathWithoutExt = relativePath.replace(ext, '');
	const parts = pathWithoutExt.split('/');

	// Start with self (slug), then add ancestors from immediate parent to root
	const regionPathIds: Array<string> = [slug];

	for (let i = parts.length - 2; i >= 0; i--) {
		const part = parts[i];
		if (part) regionPathIds.push(part);
	}

	return regionPathIds;
}

/**
 * Parse region data from data-store entries
 */
export function parseRegionData(entries: Array<DataStoreEntry>) {
	const regions: Array<RegionMetadata> = [];

	for (const entry of entries) {
		const slug = entry.id;
		const regionPathIds = entry.filePath ? getRegionPathIds(entry.filePath, slug) : [slug];

		const divisionSelectionBBox = GeometryBoundingBoxSchema.optional().parse(
			entry.data.divisionSelectionBBox,
		);
		const divisionClippingBBox = GeometryBoundingBoxSchema.optional().parse(
			entry.data.divisionClippingBBox,
		);

		const divisionIdValue = GeometryDivisionIdSchema.optional().parse(entry.data.divisionId);

		let divisionIds: Array<string> = [];

		if (divisionIdValue) {
			divisionIds = Array.isArray(divisionIdValue)
				? divisionIdValue.filter((id): id is string => typeof id === 'string')
				: [divisionIdValue].filter((id): id is string => typeof id === 'string');
		}

		regions.push({
			slug,
			divisionIds,
			regionPathIds,
			...(divisionSelectionBBox ? { divisionSelectionBBox } : {}),
			...(divisionClippingBBox ? { divisionClippingBBox } : {}),
		});
	}

	const regionsWithDivisionIds = regions.filter((r) => r.divisionIds.length > 0);

	console.log(
		chalk.green(
			`Found ${chalk.cyan(String(regionsWithDivisionIds.length))} regions with division IDs (${chalk.cyan(String(regions.length))} total regions)`,
		),
	);

	return { allRegions: regions, regionsWithDivisionIds };
}

/**
 * Resolve a bounding box hierarchically by walking up the ancestry chain
 */
export function resolveBoundingBox(
	region: RegionMetadata,
	regionsBySlug: Map<string, RegionMetadata>,
	bboxField: 'divisionSelectionBBox' | 'divisionClippingBBox',
): GeometryBoundingBox | undefined {
	for (const ancestorSlug of region.regionPathIds) {
		const ancestor = regionsBySlug.get(ancestorSlug);

		if (ancestor?.[bboxField]) return ancestor[bboxField];
	}
	return undefined;
}
