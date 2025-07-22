import type { FeatureCollection } from 'geojson';

import { geojson } from 'flatgeobuf';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';

import { safelyCreateDirectory } from './utils';

export async function saveFlatgeobuf(
	geojsonData: FeatureCollection,
	slug: string,
	outputDir: string,
) {
	await safelyCreateDirectory(outputDir);

	const filePath = path.join(outputDir, `${slug}.fgb`);

	try {
		// Attempt to enforce a standard projection, WGS84 (EPSG:4326)
		const fgbBuffer = geojson.serialize(geojsonData, 4326);

		await fs.writeFile(filePath, fgbBuffer);

		console.log(chalk.gray(`Saved FlatGeobuf file to: ${chalk.cyan(filePath)}`));
	} catch (error) {
		console.error(chalk.red(`Failed to serialize FlatGeobuf for ${chalk.cyan(slug)}:`), error);
		throw error;
	}
}
