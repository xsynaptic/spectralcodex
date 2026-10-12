import type { FeatureCollection } from 'geojson';

import { truncate } from '@turf/turf';
import chalk from 'chalk';
import { serialize } from 'flatgeobuf/geojson';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants } from 'node:zlib';

import { safelyCreateDirectory } from '#shared/utils.ts';

// RFC 7946 recommends six decimal places, about 11 cm
const coordinatePrecision = 6;

const compress = promisify(brotliCompress);

export async function saveFlatgeobuf(
	geojsonData: FeatureCollection,
	id: string,
	outputDir: string,
) {
	safelyCreateDirectory(outputDir);

	const filePath = path.join(outputDir, `${id}.fgb`);

	try {
		// FlatGeobuf stores doubles, so rounding only pays off once the file is compressed in transit
		const roundedData = truncate(geojsonData, { coordinates: 2, precision: coordinatePrecision });

		// Attempt to enforce a standard projection, WGS84 (EPSG:4326)
		const fgbBuffer = serialize(roundedData, 4326);

		// Caddy serves this sidecar in place of the original; neither it nor Cloudflare compress octet-stream
		const compressedBuffer = await compress(fgbBuffer, {
			params: {
				[constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
				[constants.BROTLI_PARAM_SIZE_HINT]: fgbBuffer.length,
			},
		});

		await fs.writeFile(filePath, fgbBuffer);
		await fs.writeFile(`${filePath}.br`, compressedBuffer);

		console.log(chalk.gray(`Saved FlatGeobuf file to: ${chalk.cyan(filePath)}`));
	} catch (error) {
		console.error(chalk.red(`Failed to serialize FlatGeobuf for ${chalk.cyan(id)}:`), error);
		throw error;
	}
}
