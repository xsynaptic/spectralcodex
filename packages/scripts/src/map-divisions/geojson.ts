import type { BBox, Feature } from 'geojson';

import { bbox } from '@turf/bbox';
import { bboxPolygon } from '@turf/bbox-polygon';
import { difference } from '@turf/difference';
import { distance } from '@turf/distance';
import { feature, featureCollection, lengthToDegrees } from '@turf/helpers';
import { simplify } from '@turf/simplify';
import { truncate } from '@turf/truncate';
import { union } from '@turf/union';
import fs from 'node:fs/promises';
import path from 'node:path';

import type {
	DivisionFeatureCollection,
	DivisionGeometry,
	DivisionItem,
} from '#map-divisions/types.ts';

import { log } from '#shared/cli-output.ts';
import { safelyCreateDirectory } from '#shared/files.ts';

const maskToleranceExponent = 0.6;
const maskToleranceMetresPerKm = 0.34;
const maskCoordinatePrecision = 6;
const worldBounds = [-180, -85, 180, 85] satisfies BBox;

export function convertToFeatureCollection(
	divisionItems: Array<DivisionItem>,
): DivisionFeatureCollection {
	if (divisionItems.length === 1 && divisionItems[0]) {
		return featureCollection([
			feature(divisionItems[0].geometry, undefined, { id: divisionItems[0].divisionId }),
		]);
	}

	const divisionItemsUnion =
		divisionItems.length > 1
			? union(
					featureCollection(
						divisionItems.map((divisionItem) =>
							feature(divisionItem.geometry, undefined, { id: divisionItem.divisionId }),
						),
					),
				)
			: undefined;

	return featureCollection<DivisionGeometry>(
		divisionItemsUnion ? [feature(divisionItemsUnion.geometry)] : [],
	);
}

export async function saveDivisionMask(
	divisionFeatureCollection: DivisionFeatureCollection,
	id: string,
	outputDir: string,
) {
	const [division] = divisionFeatureCollection.features;

	if (!division) throw new Error(`No Division geometry to mask for ${id}`);

	const toleranceMetres = getMaskToleranceMetres(division);
	const simplified = simplify(division, {
		highQuality: true,
		tolerance: lengthToDegrees(toleranceMetres, 'meters'),
	});
	const mask = difference(featureCollection([bboxPolygon(worldBounds), simplified]));

	if (!mask) throw new Error(`Division for ${id} covers the world, leaving no mask`);

	const rounded = truncate(mask, { coordinates: 2, precision: maskCoordinatePrecision });

	safelyCreateDirectory(outputDir);

	const filePath = path.join(outputDir, `${id}.json`);

	await fs.writeFile(filePath, JSON.stringify(rounded.geometry));

	log.detail(`Saved ${id}.json (tolerance ${toleranceMetres.toFixed(1)} m)`);
}

function getMaskToleranceMetres(division: Feature<DivisionGeometry>) {
	const [west, south, east, north] = bbox(division);
	const diagonalKm = distance([west, south], [east, north]);

	return maskToleranceMetresPerKm * diagonalKm ** maskToleranceExponent;
}
