#!/usr/bin/env tsx
import type { FeatureCollection } from 'geojson';

import { geojson } from 'flatgeobuf';
import fs from 'node:fs/promises';
import path from 'node:path';

import { safelyCreateDirectory } from './utils';

export async function saveFlatgeobuf(
	geojsonData: FeatureCollection,
	slug: string,
	outputPath: string,
) {
	const outputDir = path.join(process.cwd(), outputPath);

	await safelyCreateDirectory(outputDir);

	const filePath = path.join(outputDir, `${slug}.fgb`);

	try {
		// Attempt to enforce a standard projection, WGS84 (EPSG:4326)
		const fgbBuffer = geojson.serialize(geojsonData, 4326);

		await fs.writeFile(filePath, fgbBuffer);

		console.log(`Saved FlatGeobuf to: ${filePath}`);
	} catch (error) {
		console.error(`Failed to serialize FlatGeobuf for ${slug}:`, error);
		throw error;
	}
}
