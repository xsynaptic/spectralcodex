import type { FeatureCollection } from 'geojson';

import { truncate } from '@turf/turf';
import chalk from 'chalk';
import { serialize } from 'flatgeobuf/geojson';
import fs from 'node:fs/promises';
import path from 'node:path';

import { safelyCreateDirectory } from '#shared/utils.ts';

const coordinatePrecision = 6;

export async function saveFlatgeobuf(
	geojsonData: FeatureCollection,
	id: string,
	outputDir: string,
) {
	safelyCreateDirectory(outputDir);

	const filePath = path.join(outputDir, `${id}.fgb`);

	try {
		const roundedData = truncate(geojsonData, { coordinates: 2, precision: coordinatePrecision });

		const fgbBuffer = serialize(roundedData, 4326);

		await fs.writeFile(filePath, fgbBuffer);

		console.log(chalk.gray(`Saved FlatGeobuf file to: ${chalk.cyan(filePath)}`));
	} catch (error) {
		console.error(chalk.red(`Failed to serialize FlatGeobuf for ${chalk.cyan(id)}:`), error);
		throw error;
	}
}
