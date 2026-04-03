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
function getRegionPathIds(filePath: string, id: string): Array<string> {
	const collectionMarker = 'collections/regions/';
	const index = filePath.indexOf(collectionMarker);

	if (index === -1) return [id];

	const relativePath = filePath.slice(index + collectionMarker.length);
	const ext = path.extname(relativePath);
	const pathWithoutExt = relativePath.replace(ext, '');
	const parts = pathWithoutExt.split('/');

	// Start with self then add ancestors from immediate parent to root
	const regionPathIds: Array<string> = [id];

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
		const id = entry.id;
		const regionPathIds = entry.filePath ? getRegionPathIds(entry.filePath, id) : [id];

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
			id,
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
	regionsById: Map<string, RegionMetadata>,
	bboxField: 'divisionSelectionBBox' | 'divisionClippingBBox',
): GeometryBoundingBox | undefined {
	for (const ancestorId of region.regionPathIds) {
		const ancestor = regionsById.get(ancestorId);

		if (ancestor?.[bboxField]) return ancestor[bboxField];
	}
	return undefined;
}
