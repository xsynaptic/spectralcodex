import type { BBox } from 'geojson';

import { feature, featureCollection } from '@turf/helpers';
import { bboxPolygon, difference, simplify, truncate, union } from '@turf/turf';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';

import type {
	DivisionFeatureCollection,
	DivisionGeometry,
	DivisionItem,
} from '#map-divisions/types.ts';

import { safelyCreateDirectory } from '#shared/utils.ts';

const maskSimplifyTolerance = 0.0001;
const maskCoordinatePrecision = 5;
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

	const simplified = simplify(division, { highQuality: true, tolerance: maskSimplifyTolerance });
	const mask = difference(featureCollection([bboxPolygon(worldBounds), simplified]));

	if (!mask) throw new Error(`Division for ${id} covers the world, leaving no mask`);

	const rounded = truncate(mask, { coordinates: 2, precision: maskCoordinatePrecision });

	safelyCreateDirectory(outputDir);

	const filePath = path.join(outputDir, `${id}.json`);

	await fs.writeFile(filePath, JSON.stringify(rounded.geometry));

	console.log(chalk.gray(`Saved Division mask to: ${chalk.cyan(filePath)}`));
}
