import type { GeometryBoundingBox } from '@spectralcodex/shared/schemas';
import type { ContentEntry } from '@xsynaptic/astro-scripts';

import { GeometryBoundingBoxSchema, GeometryDivisionIdSchema } from '@spectralcodex/shared/schemas';
import { formatCount, log } from '@xsynaptic/astro-scripts';
import path from 'node:path';

import type { RegionMetadata } from '#map-divisions/types.ts';

export function getDivisionIds(entry: ContentEntry): Array<string> {
	const divisionId = GeometryDivisionIdSchema.optional().parse(entry.data.divisionId);

	if (!divisionId) return [];

	return Array.isArray(divisionId) ? divisionId : [divisionId];
}

export function parseRegionData(entries: Array<ContentEntry>) {
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

		regions.push({
			divisionIds: getDivisionIds(entry),
			id,
			regionPathIds,
			...(divisionSelectionBBox ? { divisionSelectionBBox } : {}),
			...(divisionClippingBBox ? { divisionClippingBBox } : {}),
		});
	}

	const regionsWithDivisionIds = regions.filter((r) => r.divisionIds.length > 0);

	log.detail(
		`${formatCount(regionsWithDivisionIds.length)} of ${formatCount(regions.length)} Regions name divisions`,
	);

	return { allRegions: regions, regionsWithDivisionIds };
}

export function resolveBoundingBox(
	region: RegionMetadata,
	regionsById: Map<string, RegionMetadata>,
	bboxField: 'divisionClippingBBox' | 'divisionSelectionBBox',
): GeometryBoundingBox | undefined {
	for (const ancestorId of region.regionPathIds) {
		const ancestor = regionsById.get(ancestorId);
		const bbox = ancestor?.[bboxField];

		if (bbox) return bbox;
	}
	return undefined;
}

function getRegionPathIds(filePath: string, id: string): Array<string> {
	const collectionMarker = 'collections/regions/';
	const index = filePath.indexOf(collectionMarker);

	if (index === -1) return [id];

	const relativePath = filePath.slice(index + collectionMarker.length);
	const ext = path.extname(relativePath);
	const pathWithoutExt = relativePath.replace(ext, '');
	const parts = pathWithoutExt.split('/');

	const regionPathIds: Array<string> = [id];

	for (let i = parts.length - 2; i >= 0; i--) {
		const part = parts[i];
		if (part) regionPathIds.push(part);
	}

	return regionPathIds;
}
