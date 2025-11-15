import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { simplify } from '@turf/turf';
import chalk from 'chalk';
import { geoIdentity, geoPath } from 'd3-geo';
import fs from 'node:fs/promises';
import path from 'node:path';

import { safelyCreateDirectory } from './utils';

interface SvgOptions {
	tolerance?: number; // Tolerance for geometry simplification (lower = more detail)
	highQuality?: boolean;
	width?: number;
	height?: number;
}

/**
 * Generates an SVG string from a GeoJSON FeatureCollection using d3-geo
 */
function generateSvg(
	geojsonData: FeatureCollection<Polygon | MultiPolygon>,
	options: SvgOptions = {},
): string {
	const { tolerance = 0.0005, highQuality = true, width = 800, height = 800 } = options;

	// Simplify geometry for decorative purposes
	const simplified = simplify(geojsonData, {
		tolerance,
		highQuality,
	});

	// Create a projection that fits the geometry to the viewport
	// geoIdentity is a "flat" projection that just scales and translates
	const projection = geoIdentity().fitSize([width, height], simplified);

	// Create a path generator
	const pathGenerator = geoPath(projection);

	// Generate path data for all features
	const pathData = simplified.features
		.map((feature) => pathGenerator(feature))
		.filter((path): path is string => path !== null)
		.join(' ');

	// Generate SVG with proper viewBox
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(width)} ${String(height)}" preserveAspectRatio="xMidYMid meet">
  <path d="${pathData}" fill="currentColor" stroke="none"/>
</svg>`;
}

/**
 * Saves a GeoJSON FeatureCollection as an optimized SVG file
 */
export async function saveSvg(
	geojsonData: FeatureCollection<Polygon | MultiPolygon>,
	slug: string,
	outputDir: string,
	options: SvgOptions = {},
): Promise<void> {
	await safelyCreateDirectory(outputDir);

	const filePath = path.join(outputDir, `${slug}.svg`);

	try {
		const svg = generateSvg(geojsonData, options);

		await fs.writeFile(filePath, svg, 'utf8');

		console.log(chalk.gray(`Saved SVG file to: ${chalk.cyan(filePath)}`));
	} catch (error) {
		console.error(chalk.red(`Failed to generate SVG for ${chalk.cyan(slug)}:`), error);
		throw error;
	}
}
