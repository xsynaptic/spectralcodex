import type { GeometryBoundingBox } from '@spectralcodex/shared/map';
import type { Feature } from 'geojson';

import { bboxClip, featureCollection, rewind, simplify } from '@turf/turf';
import chalk from 'chalk';
import { geoIdentity, geoPath } from 'd3-geo';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { DivisionFeatureCollection, DivisionGeometry } from './types';

import { safelyCreateDirectory } from '../shared/utils';

interface SvgOptions {
	// Tolerance for geometry simplification (lower = more detail)
	tolerance?: number;
	// Whether to use high-quality simplification (slower but better results)
	highQuality?: boolean;
	// Width of the SVG viewport
	width?: number;
	// Height of the SVG viewport
	height?: number;
	// Optional bounding box to clip geometry
	divisionClippingBBox?: GeometryBoundingBox;
}

/**
 * Generates an SVG string from a GeoJSON FeatureCollection using d3-geo
 * This approach references: https://css-irl.info/creating-static-svgs-from-geojson/
 */
function generateSvg(geojsonData: DivisionFeatureCollection, options: SvgOptions = {}): string {
	const {
		tolerance = 0.0002,
		highQuality = true,
		width = 800,
		height = 800,
		divisionClippingBBox,
	} = options;

	// Clip to bounding box if provided
	let clippedFeatureCollection = geojsonData;

	if (divisionClippingBBox) {
		const clippedFeatures = geojsonData.features
			.map((feature) =>
				bboxClip(feature, [
					divisionClippingBBox.lngMin,
					divisionClippingBBox.latMin,
					divisionClippingBBox.lngMax,
					divisionClippingBBox.latMax,
				]),
			)
			.map((feature) => {
				// Clean up MultiPolygons by removing empty polygon parts (clipped out)
				if (feature.geometry.type === 'MultiPolygon') {
					const validPolygons = feature.geometry.coordinates.filter(
						(polygon) => polygon.length > 0 && (polygon[0]?.length ?? 0) > 0,
					);
					return {
						...feature,
						geometry: {
							...feature.geometry,
							coordinates: validPolygons,
						},
					};
				}
				return feature;
			})
			.filter(({ geometry }) => {
				if (!['MultiPolygon', 'Polygon'].includes(geometry.type)) return false;

				// Filter out empty geometries
				if (geometry.type === 'Polygon') {
					return geometry.coordinates.length > 0 && (geometry.coordinates[0]?.length ?? 0) > 0;
				}
				// After cleanup, MultiPolygons just need at least one polygon
				return geometry.coordinates.length > 0;
			});

		clippedFeatureCollection = featureCollection(
			clippedFeatures as Array<Feature<DivisionGeometry>>,
		);
	}

	// Ensure polygons follow the right-hand rule (exterior rings counterclockwise, holes clockwise)
	// This prevents rendering issues where polygons might appear inverted or not render at all
	const corrected = rewind(clippedFeatureCollection, {
		reverse: false,
	}) as DivisionFeatureCollection;

	// Simplify geometry for decorative purposes
	const simplified = simplify(corrected, {
		tolerance,
		highQuality,
	});

	// Create a projection that fits the geometry to the viewport
	// geoIdentity is a "flat" projection that just scales and translates
	// reflectY(true) flips the Y-axis so north is up (SVG Y increases downward)
	const projection = geoIdentity().reflectY(true).fitSize([width, height], simplified);

	// Create a path generator
	const pathGenerator = geoPath(projection);

	// Calculate actual bounds of the geometry with buffer for strokes
	const bounds = pathGenerator.bounds(simplified);
	const [[x0, y0], [x1, y1]] = bounds;
	const buffer = 10; // 10px buffer to prevent stroke clipping
	const viewBoxX = x0 - buffer;
	const viewBoxY = y0 - buffer;
	const viewBoxWidth = x1 - x0 + buffer * 2;
	const viewBoxHeight = y1 - y0 + buffer * 2;

	// Generate path data for all features
	const pathData = simplified.features
		.map((feature) => pathGenerator(feature))
		.filter((path): path is string => path !== null)
		.join(' ');

	// Generate SVG with dynamic viewBox matching actual geometry bounds
	// Includes buffer to prevent stroke clipping at edges
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${String(viewBoxX)} ${String(viewBoxY)} ${String(viewBoxWidth)} ${String(viewBoxHeight)}" preserveAspectRatio="xMidYMid meet">
  <path d="${pathData}" fill="currentColor" stroke="var(--division-stroke-color, none)" stroke-width="var(--division-stroke-width, 0)" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
}

/**
 * Saves a GeoJSON FeatureCollection as an optimized SVG file
 */
export async function saveSvg({
	geojsonData,
	slug,
	outputDir,
	options = {},
}: {
	geojsonData: DivisionFeatureCollection;
	slug: string;
	outputDir: string;
	options?: SvgOptions;
}): Promise<void> {
	safelyCreateDirectory(outputDir);

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
